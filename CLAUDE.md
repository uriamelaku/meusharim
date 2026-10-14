# Couple Budget — Project Plan & Claude Instructions

## Goal
Build a mobile-first Hebrew (RTL) web app for a couple to manually track shared household income, expenses and budgets. Initially only two users, with the data model able to support additional households later. Prioritize a working, simple product over extra features.

## Decisions (approved)
- Manual entry only for now; **no bank or credit-card integration**.
- Both partners can view and manage all household entries, including entries marked personal.
- Google sign-in only via Supabase Auth.
- Only our couple will use the app initially; **no SaaS/billing features**.
- The user chooses the transaction date manually. Do not introduce separate purchase/charge-date logic yet.
- Recurring expenses and installments are **phase 2**, not MVP.
- **No AWS.** Frontend deployment: Vercel. Backend Docker hosting: Railway (unless user changes this). Database/Auth: Supabase.

## Tech stack
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query.
- Backend: Python, FastAPI, SQLAlchemy 2, Alembic, psycopg 3 (synchronous initially).
- Database: PostgreSQL (Supabase in deployed environments; local PostgreSQL container for development/tests).
- Authentication: Supabase Auth (Google OAuth), JWT validation in FastAPI.
  - Production/dev: verify tokens against the Supabase project's JWKS (check signature, `exp`, `aud`). Local development with real login uses a separate Supabase dev project.
  - Automated tests never use Google or Supabase: the test suite signs its own JWTs with a test key, and the backend accepts that key only when configured for tests.
- Docker: Dockerfile per frontend/backend, Docker Compose for frontend + backend + local PostgreSQL.
- PWA: add basic installability during MVP.
- Repository: Git/GitHub; tests and GitHub Actions as the project matures.

## Architecture & security
- Modular monolith; no microservices.
- All application data access goes through FastAPI REST endpoints; frontend uses Supabase only for authentication.
- Verify access tokens server-side and enforce household membership on every protected request.
- Enable and test PostgreSQL RLS on household-owned tables. Carefully design the DB connection role/session context so RLS actually applies; never assume a service-role connection enforces it.
- RLS must behave identically on local PostgreSQL and Supabase. Do not reference Supabase-only objects (`auth.uid()`, `auth.users`) in policies. Policies use our own `app.current_user_id()`, which reads the user id from `current_setting('request.jwt.claims', true)`. Migrations create the `authenticated` role if it does not exist. Per request, inside the transaction, the backend runs `SET LOCAL ROLE authenticated` and sets `request.jwt.claims` with `set_config(..., true)`.
- Never expose database credentials or privileged Supabase keys in the frontend. Restrict CORS, validate input, and never commit secrets.
- Keep database schema changes in Alembic migrations; avoid manual schema drift.
- Store monetary values as integer minor units (agorot), never floating point.
- Use Asia/Jerusalem for month/date interpretation; store transaction dates as DATE.
- Scope household data with household_id. Prevent cross-household access with automated tests.

## MVP (Phase 1)
1. Project skeleton: repository structure, Dockerfiles, compose.yaml, environment examples, README.
2. End-to-end Google login: React -> Supabase Auth -> FastAPI JWT validation.
3. Create household and invite/join second partner securely.
4. Default editable income/expense categories.
5. Manual transactions: amount, type, category, date, optional note, `created_by`, `paid_by`, personal/shared flag; list, add, edit and delete.
   - `amount` is always a positive integer in agorot; `type` (`income` | `expense`) determines direction.
   - `created_by` is set automatically by the server to the authenticated user and is never accepted from the client.
   - `paid_by` is chosen by the user: one of the household members, or `joint` (shared account).
6. Monthly budgets per category with sensible defaults.
7. Dashboard: monthly income, expenses, net difference, remaining budget, category breakdown.
8. Mobile-first RTL interface with fast entry flow; basic PWA.
9. Automated tests for financial calculations and household authorization.

## Later phases
- **Phase 2:** recurring expenses, installments and planned future transactions using a unified transaction ledger; prevent duplicates and double counting.
- **Phase 3:** month comparisons, charts, search/filter, CSV import/export and monthly review.
- **Phase 4:** savings goals and optional AI insights, only if useful.

## Working rules for Claude
Follow this file as the project source of truth; propose edits when decisions change.

**Workflow**
- Work in small, verifiable steps; complete and verify each step before the next. Follow the phases above; do not implement unrequested features or future phases early.
- Before a significant change, briefly state what will be changed.
- Keep every change runnable and testable locally through Docker.

**Code quality**
- Treat this as a real product maintained over time, but avoid overengineering.
- Clean, readable, maintainable code following Python/FastAPI and React/TypeScript best practices. Prefer the simplest solution that works (KISS).
- No duplication (DRY): reuse existing components and functions. No speculative features or abstractions (YAGNI): no unnecessary layers, files, microservices, Redis or AWS.
- Clear, descriptive names for variables, functions and classes.
- Small functions with a single clear responsibility, without excessive splitting.
- Keep business logic, database access and UI separate.
- Comment only where the code is not self-explanatory. Handle errors explicitly; never swallow them silently.
- Do not rewrite working code or optimize without a concrete need.
- Do not add frameworks, libraries, services or dependencies without a clear reason. Ask before major architectural changes.
- If you spot a problem or a better approach, present it with a recommendation instead of silently changing course.

**Testing**
- Run relevant tests and lint checks after changes, and fix errors before considering a task complete.
- Never claim tests passed unless they were actually executed.
- Write tests for important logic, especially financial calculations and security/authorization.

**Security**
- Never expose or commit API keys, passwords, secrets or `.env` files with real values.
- Validate all input on the backend. Enforce authentication and authorization on every protected endpoint.

**Database**
- All schema changes go through Alembic migrations.
- Explain significant schema changes before applying them.
- Never drop tables or delete production data without explicit approval.

**Git**
- Do not create commits automatically. Recommend when a commit is appropriate, briefly list what it should include, and wait for approval.
- **Never push to GitHub (any branch, including `main`) without explicit permission.** A local commit does not authorize a push.
- The dev environment is ephemeral and unpushed commits can be lost: at the end of each task, mention any commits that are not yet pushed and ask whether to push.
- Never merge to `main` or open a pull request without explicit approval.

**Deployment**
- Never deploy to production, activate paid services, or change external infrastructure without explicit approval.

**Communication**
- Communicate in Hebrew; keep explanations short, clear and practical.
- After each task, summarize what changed, what was tested, remaining issues or risks, and the next step.

## First implementation task
Create the minimal repository skeleton and working Docker Compose setup with a Vite React frontend, FastAPI backend, and local PostgreSQL. Add a basic health endpoint and a frontend screen that can call it. Provide .env.example and setup instructions. Do not implement authentication or financial features in this first task; those follow once the skeleton works.
