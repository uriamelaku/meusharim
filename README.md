# Meusharim (מאושרים)

Couple budget web app: shared household income, expenses and budgets. Hebrew (RTL), mobile-first.

See [CLAUDE.md](CLAUDE.md) for the project plan, decisions and working rules.

## Stack

- `frontend/` — React + TypeScript (Vite)
- `backend/` — Python + FastAPI, SQLAlchemy, psycopg 3
- `db` — PostgreSQL 17 (local container; Supabase in deployed environments)

## Run locally

Requirements: Docker with Docker Compose.

```bash
cp .env.example .env   # optional: defaults work without it
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend health check: http://localhost:8000/api/health
- API docs: http://localhost:8000/docs

The frontend dev server proxies `/api/*` to the backend. Code changes in `frontend/` and `backend/` reload automatically.

## Checks

```bash
# Backend tests and lint (stack must be running)
docker compose exec backend pytest -p no:cacheprovider
docker compose exec backend ruff check --no-cache .
docker compose exec backend ruff format --check --no-cache .

# Frontend lint and type-check/build
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

## Reset the local database

```bash
docker compose down -v
```
