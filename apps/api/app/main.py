import math
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import select, text

from .database import Base, engine, get_db
from .models import Airport, FlightPlan, User
from .schemas import (
    AirportOut,
    FlightPlanCreate,
    FlightPlanOut,
    FlightPlanUpdate,
    TokenOut,
    UserLogin,
    UserSignup,
)
from .seed import seed_demo_data

app = FastAPI(title="Navi Planner API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXPIRE_HOURS = 24


@app.on_event("startup")
def startup():
    for i in range(30):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            break
        except Exception:
            if i == 29:
                raise
            time.sleep(1)

    Base.metadata.create_all(bind=engine)
    with next(get_db()) as db:
        seed_demo_data(db)


def create_access_token(user_id: str, email: str):
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": user_id, "email": email, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if not creds:
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid token")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="user not found")
    return user


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/v1/auth/signup", response_model=TokenOut)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="email already registered")

    hashed = pwd_context.hash(payload.password)
    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        name=payload.name,
        plan="free",
    )
    # 簡化版：先把 hash 存在 name 後綴之外的欄位不合理，故直接用 cycle 方案不可行
    # 這裡用 SQLAlchemy 動態欄位避免改 migration：在 demo 階段以 email+password 明碼不安全，不採用
    # 改為利用一個臨時映射：把 hash 存在 name 前綴標記（僅 MVP 開發）
    user.name = f"{payload.name or ''}||HASH::{hashed}"

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenOut(access_token=token)


@app.post("/v1/auth/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="invalid credentials")

    stored = user.name or ""
    if "||HASH::" not in stored:
        # 相容舊 demo-user
        if user.id == "demo-user" and payload.password == "demo1234":
            return TokenOut(access_token=create_access_token(user.id, user.email))
        raise HTTPException(status_code=401, detail="invalid credentials")

    _, hashed = stored.split("||HASH::", 1)
    if not pwd_context.verify(payload.password, hashed):
        raise HTTPException(status_code=401, detail="invalid credentials")

    token = create_access_token(user.id, user.email)
    return TokenOut(access_token=token)


@app.get("/v1/auth/me")
def me(user: User = Depends(get_current_user)):
    display_name = (user.name or "").split("||HASH::", 1)[0] or None
    return {"id": user.id, "email": user.email, "name": display_name, "plan": user.plan}


@app.get("/v1/airports", response_model=list[AirportOut])
def list_airports(query: str = Query(default=""), db: Session = Depends(get_db)):
    q = query.strip().upper()
    rows = db.execute(select(Airport)).scalars().all()
    if not q:
        return rows
    return [a for a in rows if q in a.icao.upper() or (a.iata and q in a.iata.upper()) or q in a.name.upper()]


@app.get("/v1/weather/{icao}")
def get_weather(icao: str, db: Session = Depends(get_db)):
    airport = db.get(Airport, icao.upper())
    if not airport:
        raise HTTPException(status_code=404, detail="airport not found")

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": airport.lat,
                    "longitude": airport.lon,
                    "current": "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code",
                    "timezone": "UTC",
                },
            )
            resp.raise_for_status()
            payload = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"weather upstream error: {e}")

    current = payload.get("current", {})
    return {
        "icao": airport.icao,
        "name": airport.name,
        "temperature_c": current.get("temperature_2m"),
        "wind_speed_kmh": current.get("wind_speed_10m"),
        "wind_direction_deg": current.get("wind_direction_10m"),
        "weather_code": current.get("weather_code"),
        "observed_at": current.get("time"),
    }


@app.get("/v1/flight-plans", response_model=list[FlightPlanOut])
def list_flight_plans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(FlightPlan).where(FlightPlan.user_id == user.id).order_by(FlightPlan.created_at.desc())
    return db.execute(stmt).scalars().all()


@app.post("/v1/flight-plans", response_model=FlightPlanOut)
def create_flight_plan(payload: FlightPlanCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.get(Airport, payload.dep_icao):
        raise HTTPException(status_code=400, detail="dep_icao not found")
    if not db.get(Airport, payload.arr_icao):
        raise HTTPException(status_code=400, detail="arr_icao not found")

    fp = FlightPlan(**payload.model_dump(), user_id=user.id)
    db.add(fp)
    db.commit()
    db.refresh(fp)
    return fp


def get_owned_flight_plan(flight_plan_id: str, user: User, db: Session):
    fp = db.get(FlightPlan, flight_plan_id)
    if not fp or fp.user_id != user.id:
        raise HTTPException(status_code=404, detail="flight plan not found")
    return fp


@app.get("/v1/flight-plans/{flight_plan_id}", response_model=FlightPlanOut)
def get_flight_plan(flight_plan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_owned_flight_plan(flight_plan_id, user, db)


@app.patch("/v1/flight-plans/{flight_plan_id}", response_model=FlightPlanOut)
def update_flight_plan(
    flight_plan_id: str,
    payload: FlightPlanUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fp = get_owned_flight_plan(flight_plan_id, user, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(fp, k, v)
    db.commit()
    db.refresh(fp)
    return fp


@app.delete("/v1/flight-plans/{flight_plan_id}")
def delete_flight_plan(flight_plan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fp = get_owned_flight_plan(flight_plan_id, user, db)
    db.delete(fp)
    db.commit()
    return {"ok": True}


def haversine_nm(lat1, lon1, lat2, lon2):
    r_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    km = r_km * c
    return km * 0.539957


@app.post("/v1/flight-plans/{flight_plan_id}/compute")
def compute_flight_plan(flight_plan_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fp = get_owned_flight_plan(flight_plan_id, user, db)
    dep = db.get(Airport, fp.dep_icao)
    arr = db.get(Airport, fp.arr_icao)
    dist_nm = haversine_nm(dep.lat, dep.lon, arr.lat, arr.lon)

    cruise_tas = 420
    fuel_burn_kgph = 2500
    ete_hr = dist_nm / cruise_tas
    fuel_kg = ete_hr * fuel_burn_kgph

    return {
        "flight_plan_id": fp.id,
        "distance_nm": round(dist_nm, 1),
        "ete_hr": round(ete_hr, 2),
        "fuel_estimate_kg": round(fuel_kg, 0),
    }


@app.post("/v1/flight-plans/{flight_plan_id}/export")
def export_flight_plan(
    flight_plan_id: str,
    format: str = Query(default="json"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fp = get_owned_flight_plan(flight_plan_id, user, db)

    if format not in ["json", "pln", "fms"]:
        raise HTTPException(status_code=400, detail="format must be json|pln|fms")

    filename = f"flightplan-{fp.id}.{format}"

    if format == "json":
        data = {"id": fp.id, "dep": fp.dep_icao, "arr": fp.arr_icao, "route": fp.route_text or "", "fl": fp.flight_level}
        return JSONResponse(content=data, headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    if format == "pln":
        text_pln = f"[PLN]\nDEP={fp.dep_icao}\nARR={fp.arr_icao}\nROUTE={fp.route_text or ''}\nFL={fp.flight_level or ''}"
        return PlainTextResponse(content=text_pln, media_type="text/plain", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    text_fms = f"I\n3 version\n1\n{fp.dep_icao}\n{fp.arr_icao}\n{fp.route_text or ''}"
    return PlainTextResponse(content=text_fms, media_type="text/plain", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
