import math
import time
import httpx
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from .database import Base, engine, get_db
from .models import Airport, FlightPlan
from .schemas import AirportOut, FlightPlanCreate, FlightPlanOut, FlightPlanUpdate
from .seed import seed_demo_data

app = FastAPI(title="Navi Planner API", version="0.2.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    # 等待資料庫就緒（避免容器剛啟動時 connection refused）
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


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/v1/airports", response_model=list[AirportOut])
def list_airports(query: str = Query(default=""), db: Session = Depends(get_db)):
    q = query.strip().upper()
    stmt = select(Airport)
    rows = db.execute(stmt).scalars().all()
    if not q:
        return rows
    return [a for a in rows if q in a.icao.upper() or (a.iata and q in a.iata.upper()) or q in a.name.upper()]


@app.get("/v1/weather/{icao}")
def get_weather(icao: str, db: Session = Depends(get_db)):
    airport = db.get(Airport, icao.upper())
    if not airport:
        raise HTTPException(status_code=404, detail="airport not found")

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": airport.lat,
        "longitude": airport.lon,
        "current": "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code",
        "timezone": "UTC",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params)
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
def list_flight_plans(user_id: str = Query(default="demo-user"), db: Session = Depends(get_db)):
    stmt = select(FlightPlan).where(FlightPlan.user_id == user_id).order_by(FlightPlan.created_at.desc())
    return db.execute(stmt).scalars().all()


@app.post("/v1/flight-plans", response_model=FlightPlanOut)
def create_flight_plan(payload: FlightPlanCreate, db: Session = Depends(get_db)):
    if not db.get(Airport, payload.dep_icao):
        raise HTTPException(status_code=400, detail="dep_icao not found")
    if not db.get(Airport, payload.arr_icao):
        raise HTTPException(status_code=400, detail="arr_icao not found")

    fp = FlightPlan(**payload.model_dump())
    db.add(fp)
    db.commit()
    db.refresh(fp)
    return fp


@app.get("/v1/flight-plans/{flight_plan_id}", response_model=FlightPlanOut)
def get_flight_plan(flight_plan_id: str, db: Session = Depends(get_db)):
    fp = db.get(FlightPlan, flight_plan_id)
    if not fp:
        raise HTTPException(status_code=404, detail="flight plan not found")
    return fp


@app.patch("/v1/flight-plans/{flight_plan_id}", response_model=FlightPlanOut)
def update_flight_plan(flight_plan_id: str, payload: FlightPlanUpdate, db: Session = Depends(get_db)):
    fp = db.get(FlightPlan, flight_plan_id)
    if not fp:
        raise HTTPException(status_code=404, detail="flight plan not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(fp, k, v)

    db.commit()
    db.refresh(fp)
    return fp


@app.delete("/v1/flight-plans/{flight_plan_id}")
def delete_flight_plan(flight_plan_id: str, db: Session = Depends(get_db)):
    fp = db.get(FlightPlan, flight_plan_id)
    if not fp:
        raise HTTPException(status_code=404, detail="flight plan not found")
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
def compute_flight_plan(flight_plan_id: str, db: Session = Depends(get_db)):
    fp = db.get(FlightPlan, flight_plan_id)
    if not fp:
        raise HTTPException(status_code=404, detail="flight plan not found")

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
def export_flight_plan(flight_plan_id: str, format: str = Query(default="json"), db: Session = Depends(get_db)):
    fp = db.get(FlightPlan, flight_plan_id)
    if not fp:
        raise HTTPException(status_code=404, detail="flight plan not found")

    if format not in ["json", "pln", "fms"]:
        raise HTTPException(status_code=400, detail="format must be json|pln|fms")

    filename = f"flightplan-{fp.id}.{format}"

    if format == "json":
        data = {
            "id": fp.id,
            "dep": fp.dep_icao,
            "arr": fp.arr_icao,
            "route": fp.route_text or "",
            "fl": fp.flight_level,
        }
        return JSONResponse(
            content=data,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    if format == "pln":
        text_pln = f"[PLN]\nDEP={fp.dep_icao}\nARR={fp.arr_icao}\nROUTE={fp.route_text or ''}\nFL={fp.flight_level or ''}"
        return PlainTextResponse(
            content=text_pln,
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    text_fms = f"I\n3 version\n1\n{fp.dep_icao}\n{fp.arr_icao}\n{fp.route_text or ''}"
    return PlainTextResponse(
        content=text_fms,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
