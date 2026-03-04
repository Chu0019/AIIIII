from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Navi Planner API", version="0.1.0")


class Airport(BaseModel):
    icao: str
    iata: str | None = None
    name: str
    country: str | None = None


FAKE_AIRPORTS = [
    Airport(icao="RJTT", iata="HND", name="Tokyo Haneda", country="JP"),
    Airport(icao="RCTP", iata="TPE", name="Taoyuan Intl", country="TW"),
    Airport(icao="KSFO", iata="SFO", name="San Francisco Intl", country="US"),
]


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/v1/airports", response_model=list[Airport])
def list_airports(query: str = ""):
    q = query.strip().upper()
    if not q:
        return FAKE_AIRPORTS
    return [a for a in FAKE_AIRPORTS if q in a.icao or (a.iata and q in a.iata) or q in a.name.upper()]
