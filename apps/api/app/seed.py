from sqlalchemy.orm import Session
from .models import Airport, User, Waypoint


def seed_demo_data(db: Session):
    airports = [
        Airport(icao="RJTT", iata="HND", name="Tokyo Haneda", country="JP", lat=35.5494, lon=139.7798, elevation_ft=21),
        Airport(icao="RCTP", iata="TPE", name="Taoyuan Intl", country="TW", lat=25.0777, lon=121.2328, elevation_ft=106),
        Airport(icao="KSFO", iata="SFO", name="San Francisco Intl", country="US", lat=37.6213, lon=-122.3790, elevation_ft=13),
    ]
    for a in airports:
        if not db.get(Airport, a.icao):
            db.add(a)

    if not db.get(User, "demo-user"):
        db.add(User(id="demo-user", email="demo@example.com", name="Demo User", plan="free"))

    waypoints = [
        ("DINTY", 33.0, 150.0),
        ("NIPPI", 37.5, 170.0),
        ("NANAC", 40.0, -170.0),
        ("LOSHN", 39.0, -150.0),
    ]
    for ident, lat, lon in waypoints:
        exists = db.query(Waypoint).filter(Waypoint.ident == ident).first()
        if not exists:
            db.add(Waypoint(ident=ident, lat=lat, lon=lon))

    db.commit()
