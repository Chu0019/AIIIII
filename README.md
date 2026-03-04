# AIIIII

Navi Planner Monorepo (MVP skeleton)

## Structure

- `apps/api` - FastAPI backend
- `apps/web` - Next.js frontend
- `infra` - DB schema
- `docs` - roadmap/api docs

## Run with Docker

```bash
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:8000/health

## Local run (without Docker)

### API
```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Web
```bash
cd apps/web
npm install
npm run dev
```
