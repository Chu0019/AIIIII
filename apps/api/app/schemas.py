from datetime import datetime
from pydantic import BaseModel, Field


class AirportOut(BaseModel):
    icao: str
    iata: str | None = None
    name: str
    country: str | None = None
    lat: float
    lon: float

    class Config:
        from_attributes = True


class FlightPlanCreate(BaseModel):
    user_id: str = Field(default="demo-user")
    dep_icao: str
    arr_icao: str
    route_text: str | None = None
    flight_level: int | None = None
    cycle: str | None = None


class FlightPlanUpdate(BaseModel):
    route_text: str | None = None
    flight_level: int | None = None
    cycle: str | None = None


class FlightPlanOut(BaseModel):
    id: str
    user_id: str
    dep_icao: str
    arr_icao: str
    route_text: str | None = None
    flight_level: int | None = None
    cycle: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
