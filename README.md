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
cp .env.example .env   # then fill in SUPABASE_PUBLISHABLE_KEY
docker compose up --build
```

`SUPABASE_PUBLISHABLE_KEY` is in the Supabase dashboard of the `meusharim-dev` project
(Project Settings → API Keys). Never use the secret key here.

- Frontend: http://localhost:5173
- Backend health check: http://localhost:8000/api/health
- API docs: http://localhost:8000/docs

The frontend dev server proxies `/api/*` to the backend. Code changes in `frontend/` and `backend/` reload automatically.

## Database migrations

Alembic migrations live in `backend/migrations/`. The backend container runs
`alembic upgrade head` on startup. To run them manually:

```bash
docker compose exec backend alembic upgrade head
```

Row level security: every API request runs inside a transaction as the `authenticated`
role with `request.jwt.claims` set from the verified JWT (see `backend/app/db.py`).

## Features and API

All household data goes through FastAPI (`/docs` lists every endpoint):

| Area | Endpoints |
|---|---|
| Categories | `GET/POST /api/categories`, `PATCH/DELETE /api/categories/{id}` (delete archives a used category) |
| Transactions | `GET/POST /api/transactions` (filters, search, sort, paging), `PATCH/DELETE /api/transactions/{id}`, `POST /api/transactions/confirm` |
| Recurring and installments | `GET/POST /api/schedules`, `GET/PATCH /api/schedules/{id}`, `POST /api/schedules/{id}/pause|resume|cancel`, `GET /api/schedules/occurrences` |
| Budgets | `GET/PUT /api/budgets?month=YYYY-MM`, `POST /api/budgets/copy-previous?month=` |
| Dashboard | `GET /api/summary?month=YYYY-MM` |
| Reports | `GET /api/reports?from=YYYY-MM&to=YYYY-MM` (up to 60 months) |

Every transaction is either `planned` or `completed`; only completed ones count as actual
money. Planned amounts (planned transactions and future schedule occurrences) are always
reported separately. The plan and progress of phases 5–9 are in
[docs/plan-phases-5-9.md](docs/plan-phases-5-9.md).

## Checks

```bash
# Backend tests and lint (stack must be running; tests use a separate *_test database)
docker compose exec backend pytest -p no:cacheprovider
docker compose exec backend ruff check --no-cache .
docker compose exec backend ruff format --check --no-cache .

# Frontend lint and type-check/build
docker compose exec frontend npm test
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for build/start commands and environment variables.

## Reset the local database

```bash
docker compose down -v
```
