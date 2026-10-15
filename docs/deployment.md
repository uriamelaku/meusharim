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

Never set the Supabase secret / service-role key: the backend does not need it.

Migrations run on every start. They are idempotent; with a single instance this is safe.
On a platform with a pre-deploy step, `alembic upgrade head` can move there instead.

## Frontend (static site)

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Rewrite | `/*` → `/index.html` (client-side routing) |

Build-time environment variables (public, embedded in the bundle):

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (safe for browsers) |
| `VITE_API_BASE_URL` | Backend origin, e.g. `https://meusharim-api.onrender.com`. Empty means same origin. |

Node version comes from `engines` in `frontend/package.json`.

## Supabase

- Auth → URL Configuration: set **Site URL** (and Redirect URLs) to the frontend URL.
- The backend reaches the database only through the pooler; never put the database
  password in the frontend.
- Only the schema is migrated. Local or test data is never copied to Supabase.
