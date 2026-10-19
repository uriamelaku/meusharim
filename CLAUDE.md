# Couple Budget — Project Plan & Claude Instructions

## Goal
Build a mobile-first Hebrew (RTL) web app for a couple to manually track shared household income, expenses and budgets. Initially only two users, with the data model able to support additional households later. Prioritize a working, simple product over extra features.

## Decisions (approved)
- Manual entry only for now; **no bank or credit-card integration**.
- Both partners can view and manage all household entries.
- Both partners have equal management rights in the household (no owner role). MVP: one household per user, at most two members, each with a personal display name.
- Partners join via a single-use invitation link (7-day expiry, not bound to an email). Only the token's SHA-256 is stored; the token travels in the URL fragment and request bodies, never in URLs sent to the server or in logs. Invitation lookups are rate-limited per user.
- Email + password sign-in only via Supabase Auth (sign up, sign in, sign out). No Google/OAuth for now.
- Only our couple will use the app initially; **no SaaS/billing features**.
- The user chooses the transaction date manually. Do not introduce separate purchase/charge-date logic yet.
- Recurring income/expenses and installments are implemented together with transactions (phases 5–9 plan in `docs/plan-phases-5-9.md`), on one unified ledger.
- Every transaction has an explicit status: `planned` or `completed`. A date passing never completes a transaction; only completed transactions count as actual in balances, budgets and reports. Planned amounts are always shown separately.
- No personal/shared flag on transactions for now.
- Budgets: the overall monthly amount is a ceiling; category budgets may not add up to more than it (checked on the server). Budget alerts are in-app only (80% and over, once per category and month on a device).
- Savings goals: a deposit is a completed expense in the goal's savings category, linked by `transactions.goal_id`; progress counts completed deposits only.
- Account deletion: requires two confirmations plus email and password re-checked on the server. A remaining partner keeps the household and its data; a last member's household is deleted. The backend holds the Supabase secret key for this single call only.
- Wording: personal sentences follow the reader's chosen gender (`household_members.gender`, chosen at join, editable in settings, asked once of existing members); general instructions stay neutral; the partner is named. Onboarding (guided tour, one-time tips) is remembered per device.
- Theme (light/dark) is a per-device setting. The app is installable (PWA); the service worker caches no data.
- Language: Hebrew (default) or English, a per-device setting like the theme; switching reloads the app in the other language and direction. Texts live next to the code as `tr({ he, en })` (no i18n library). A household's default categories are created in the language it was created in (`households.language`); existing names are user data and are not translated. Gendered forms of address exist in Hebrew only.
- **No AWS.** Deployment: Render (backend Docker Web Service + frontend Static Site, free tier) with Supabase for PostgreSQL/Auth; see `docs/deployment.md`. Keep the code platform-neutral: environment differences go through environment variables only, never platform-specific code.

## Tech stack
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query.
- Backend: Python, FastAPI, SQLAlchemy 2, Alembic, psycopg 3 (synchronous initially).
- Database: PostgreSQL (Supabase in deployed environments; local PostgreSQL container for development/tests).
- Authentication: Supabase Auth (email + password), JWT validation in FastAPI.
  - Production/dev: verify tokens against the Supabase project's JWKS (check signature, `exp`, `aud`). Local development with real login uses a separate Supabase dev project.
  - Automated tests never call Supabase: the test suite signs its own JWTs with a test key and injects it through a FastAPI dependency override. No runtime setting makes the backend accept a test key.
- Docker: Dockerfile per frontend/backend, Docker Compose for frontend + backend + local PostgreSQL.
- PWA: add basic installability during MVP.
- Repository: Git/GitHub; tests and GitHub Actions as the project matures.

## Architecture & security
- Modular monolith; no microservices.
- All application data access goes through FastAPI REST endpoints; frontend uses Supabase only for authentication.
- Verify access tokens server-side and enforce household membership on every protected request.
- Enable and test PostgreSQL RLS on household-owned tables. Carefully design the DB connection role/session context so RLS actually applies; never assume a service-role connection enforces it.
- RLS must behave identically on local PostgreSQL and Supabase. Do not reference Supabase-only objects (`auth.uid()`, `auth.users`) in policies. Policies use our own `app.current_user_id()`, which reads the user id from `current_setting('request.jwt.claims', true)`. Requests run as our own `meusharim_app` role (created by migrations; only the backend's connection can switch to it). Per request, inside the transaction, the backend runs `SET LOCAL ROLE meusharim_app` and sets `request.jwt.claims` with `set_config(..., true)`. Grants and policies on app tables go to `meusharim_app` only; Supabase's `anon`/`authenticated` roles (its Data API) get no privileges on app data, and every new table must revoke them.
- Never expose database credentials or privileged Supabase keys in the frontend. Restrict CORS, validate input, and never commit secrets.
- Keep database schema changes in Alembic migrations; avoid manual schema drift.
- Store monetary values as `NUMERIC(12,2)` (Python `Decimal`), never floating point. The API sends amounts as decimal strings with two decimals; the frontend never does floating-point arithmetic on money and all totals come from the server. Exceptions: live form previews (installment split, budget allocation) use exact integer agorot (BigInt), and chart/ring sizes are visual ratios only.
- Use Asia/Jerusalem for month/date interpretation; store transaction dates as DATE.
- Schedules (recurring entries and installments) never store future occurrences. At the start of every household request, due occurrences are written to `transactions` once (unique `(schedule_id, sequence_no)` plus a forward-only `next_sequence`), as planned or, with auto-confirm, completed. Future occurrences are computed on read.
- Scope household data with household_id. Prevent cross-household access with automated tests.

## MVP (Phase 1)
1. Project skeleton: repository structure, Dockerfiles, compose.yaml, environment examples, README.
2. End-to-end email/password auth (sign up, sign in, sign out): React -> Supabase Auth -> FastAPI JWT validation.
3. UI/UX foundation: design system (colors, typography, buttons, forms, cards) with Tailwind CSS + shadcn/ui; designed sign-up/sign-in screen; app shell with mobile bottom navigation and desktop sidebar; shared loading, error and empty states. Dashboard is a skeleton only: no fake data, no new features.
4. Create household and invite/join second partner securely.
5. Default editable income/expense categories.
6. Manual transactions: amount, type, category, date, optional note, status, `created_by`, `paid_by`; list, add, edit and delete.
   - `amount` is always positive; `type` (`income` | `expense`) determines direction.
   - `created_by` is set automatically by the server to the authenticated user and is never accepted from the client.
   - `paid_by` is chosen by the user: one of the household members, or `joint` (shared account).
7. Monthly budgets per category with sensible defaults.
8. Dashboard: monthly income, expenses, net difference, remaining budget, category breakdown.
9. Mobile-first RTL interface with fast entry flow; basic PWA.
10. Automated tests for financial calculations and household authorization.

## Later phases
- **Phase 3:** statement import: the backend core (normalized rows → preview with category suggestion and duplicate flags → commit) is done; per-provider file parsers (Cal, Max, Isracard, bank) wait for sample files, and the UI shows a disabled "coming soon" button. CSV export later. Monthly review, insights and the monthly summary are done.
- **Phase 4:** savings goals are done; optional AI insights only if useful.

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
- Commits: the user approved local commits after each verified step (see push rule below).
- **Never push to GitHub (any branch, including `main`) without explicit permission.** A local commit does not authorize a push. Current instruction from the user: commit locally after each verified step, never push.
- The dev environment is ephemeral and unpushed commits can be lost: at the end of each task, mention any commits that are not yet pushed (without asking to push while the instruction above stands).
- Never merge to `main` or open a pull request without explicit approval.

**Deployment**
- Never deploy to production, activate paid services, or change external infrastructure without explicit approval.

**Communication**
- Communicate in Hebrew; keep explanations short, clear and practical.
- After each task, summarize what changed, what was tested, remaining issues or risks, and the next step.

**Progress tracking**
- The active development plan and its progress tracker live in `docs/` (currently `docs/plan-phases-5-9.md`). Keep the tracker in that file up to date as work progresses.
- In every significant update and every summary, show the tracker list with a status mark next to each item: ✅ done and verified, 🔄 in progress, ⬜ not started, ❌ failed or needs a fix.
- Mark ✅ only after the item is implemented and its tests, lint and build actually passed.

## First implementation task
Create the minimal repository skeleton and working Docker Compose setup with a Vite React frontend, FastAPI backend, and local PostgreSQL. Add a basic health endpoint and a frontend screen that can call it. Provide .env.example and setup instructions. Do not implement authentication or financial features in this first task; those follow once the skeleton works.
