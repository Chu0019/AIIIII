import uuid
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    plan: Mapped[str] = mapped_column(String, nullable=False, default="free")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Airport(Base):
    __tablename__ = "airports"

    icao: Mapped[str] = mapped_column(String(8), primary_key=True)
    iata: Mapped[str | None] = mapped_column(String(8), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    country: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lat: Mapped[float] = mapped_column(nullable=False)
    lon: Mapped[float] = mapped_column(nullable=False)
    elevation_ft: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Waypoint(Base):
    __tablename__ = "waypoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ident: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    lat: Mapped[float] = mapped_column(nullable=False)
    lon: Mapped[float] = mapped_column(nullable=False)


class FlightPlan(Base):
    __tablename__ = "flight_plans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    dep_icao: Mapped[str] = mapped_column(String(8), ForeignKey("airports.icao"), nullable=False)
    arr_icao: Mapped[str] = mapped_column(String(8), ForeignKey("airports.icao"), nullable=False)
    route_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    flight_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    etd: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cycle: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
