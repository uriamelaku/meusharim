# Deployment

The code is platform-neutral: everything that differs between environments comes from
environment variables. The current target is **Render** (backend Docker Web Service + frontend
Static Site) with **Supabase** for PostgreSQL and Auth. Local development is unchanged
(Docker Compose with a local PostgreSQL).

## Backend (FastAPI)

| Setting | Value |
|---|---|
| Runtime | Docker |
| Root directory | `backend` |
| Dockerfile | `./Dockerfile` (context `.`); the same image as local development, without dev dependencies |
| Start command | none: the image runs `sh start.sh` (`alembic upgrade head`, then uvicorn on `$PORT`) |
| Health check | `/api/health` |

The Python version comes from the Dockerfile's base image.

Environment variables:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Secret. Supabase **session pooler** URL (IPv4, port 5432), e.g. `postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres?sslmode=require`. A plain `postgresql://` URL is accepted; the app adds the psycopg driver. |
| `SUPABASE_URL` | yes | `https://<ref>.supabase.co`. Used to verify JWTs against the project's JWKS. |
| `SUPABASE_PUBLISHABLE_KEY` | for account deletion | Same public key as the frontend. Used to re-check the password before deleting an account. |
| `SUPABASE_SECRET_KEY` | for account deletion | **Secret** (`sb_secret_...`). Used only to delete the user in Supabase Auth after the password check. Without it (or the publishable key) account deletion answers 503. |
| `CORS_ALLOWED_ORIGINS` | when the frontend is on another domain | Comma-separated origins, e.g. `https://meusharim.onrender.com`. No trailing slash. |
| `API_DOCS_ENABLED` | no | Leave unset in production: `/docs`, `/redoc` and `/openapi.json` are then off. Docker Compose sets it to `true` locally. |

The Supabase secret key is used for one call only (deleting the signed-in user's own
Auth account after a password check). It never reaches the database connection, so RLS
still applies to all app data. Never put it in a `VITE_*` variable or the frontend.

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
| Header | `/sw.js` → `Cache-Control: no-cache` (so a new service worker is picked up) |

Build-time environment variables (public, embedded in the bundle). The build fails if
either `VITE_SUPABASE_*` variable is missing; changing them requires a new build.

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (safe for browsers) |
| `VITE_API_BASE_URL` | Backend origin, e.g. `https://meusharim-api.onrender.com`. Empty means same origin. |

Node version comes from `engines` in `frontend/package.json`.

Installing as an app (PWA): `manifest.webmanifest`, the icons and `sw.js` are served
from `public/`. Browsers only offer installation over HTTPS (or `localhost`), so a phone
on the local network (`http://10.x.x.x:5173`) cannot install the development server; the
deployed site can. The service worker caches nothing; it only shows an offline page.

## Continuous integration and deploys

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

- **backend:** Ruff (lint and format check), `alembic upgrade head` on an empty PostgreSQL
  service container, then the full pytest suite.
- **frontend:** `npm ci`, oxlint, Vitest, then `npm run build` (which typechecks with `tsc -b`).

The workflow holds no secrets. Tests sign their own JWTs and fake the Supabase Auth calls;
the Supabase URLs and the publishable key in it are placeholders.

Render deploys only commits whose CI passed. Set this on **both** services (backend web
service and frontend static site):

1. Service → **Settings** → **Build & Deploy** → **Auto-Deploy** → **After CI Checks Pass**.
2. Make sure the branch is `main` and the service is connected to the GitHub repository
   through Render's GitHub app (needed for Render to read the check results).

Render then waits for all GitHub checks on the pushed commit: if any fails, that commit is
not deployed and the previous version keeps running.

Each service has a root directory (`backend`, `frontend`), and Render auto-deploys a service
only when a commit changes files inside it. A commit that touches only `docs/` or `.github/`,
or an empty commit, deploys nothing; that is expected. A manual deploy (**Manual Deploy**)
still works and skips the check, so use it only for a commit whose CI is green.

## Supabase

- Auth → URL Configuration: set **Site URL** (and Redirect URLs) to the frontend URL.
- The app does not use Supabase's Data API: the frontend only uses Supabase Auth. Migrations
  give Supabase's `anon`/`authenticated` roles no access to app tables (requests run as
  `meusharim_app`). As defense in depth the Data API can be turned off (Project Settings →
  Data API); Auth keeps working without it.
- The backend reaches the database only through the pooler; never put the database
  password in the frontend.
- Only the schema is migrated. Local or test data is never copied to Supabase.
