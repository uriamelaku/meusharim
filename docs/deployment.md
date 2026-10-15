# Deployment

The code is platform-neutral: everything that differs between environments comes from
environment variables. The current target is **Render** (backend Web Service + frontend
Static Site) with **Supabase** for PostgreSQL and Auth. Local development is unchanged
(Docker Compose with a local PostgreSQL).

## Backend (FastAPI)

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `sh start.sh` (runs `alembic upgrade head`, then uvicorn on `$PORT`) |
| Health check | `/api/health` |

Environment variables:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Secret. Supabase **session pooler** URL (IPv4, port 5432), e.g. `postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres?sslmode=require`. A plain `postgresql://` URL is accepted; the app adds the psycopg driver. |
| `SUPABASE_URL` | yes | `https://<ref>.supabase.co`. Used to verify JWTs against the project's JWKS. |
| `CORS_ALLOWED_ORIGINS` | when the frontend is on another domain | Comma-separated origins, e.g. `https://meusharim.onrender.com`. No trailing slash. |
| `PYTHON_VERSION` | recommended | e.g. `3.13.5`, to match local development. |
| `API_DOCS_ENABLED` | no | Leave unset in production: `/docs`, `/redoc` and `/openapi.json` are then off. Docker Compose sets it to `true` locally. |

Never set the Supabase secret / service-role key: the backend does not need it.

Migrations run on every start. They are idempotent; with a single instance this is safe.
On a platform with a pre-deploy step, `alembic upgrade head` can move there instead.

The previous backend version keeps serving while the new one migrates and starts, so a
migration must not break the running version (add first, remove in a later deploy, as
0006 → 0008 do). All pending migrations run in one transaction: if one fails, none
apply and the new version does not start.

Rolling back code to a version that predates the database's revision fails at start
("Can't locate revision"). Downgrade first, with the newer code:
`alembic downgrade <revision>`, run with the production `DATABASE_URL` in the environment
(never on the command line), then roll back.

## Frontend (static site)

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Rewrite | `/*` → `/index.html` (client-side routing) |

Build-time environment variables (public, embedded in the bundle). The build fails if
either `VITE_SUPABASE_*` variable is missing; changing them requires a new build.

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (safe for browsers) |
| `VITE_API_BASE_URL` | Backend origin, e.g. `https://meusharim-api.onrender.com`. Empty means same origin. |

Node version comes from `engines` in `frontend/package.json`.

## Supabase

- Auth → URL Configuration: set **Site URL** (and Redirect URLs) to the frontend URL.
- The app does not use Supabase's Data API: the frontend only uses Supabase Auth. Migrations
  give Supabase's `anon`/`authenticated` roles no access to app tables (requests run as
  `meusharim_app`). As defense in depth the Data API can be turned off (Project Settings →
  Data API); Auth keeps working without it.
- The backend reaches the database only through the pooler; never put the database
  password in the frontend.
- Only the schema is migrated. Local or test data is never copied to Supabase.
