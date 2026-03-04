# API Draft

## Auth
- POST /v1/auth/signup
- POST /v1/auth/login
- GET /v1/auth/me

## Airports/Navdata
- GET /v1/airports?query=RJTT
- GET /v1/airports/{icao}
- GET /v1/procedures?airport=RJTT&type=SID
- GET /v1/waypoints?query=ABRAM

## Flight Plans
- POST /v1/flight-plans
- GET /v1/flight-plans/{id}
- PATCH /v1/flight-plans/{id}
- POST /v1/flight-plans/{id}/compute
- POST /v1/flight-plans/{id}/export

## Weather
- GET /v1/weather/{icao}
