from sqlalchemy.orm import Session
from .models import Airport, User


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

    db.commit()
