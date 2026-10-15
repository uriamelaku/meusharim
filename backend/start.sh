#!/bin/sh
# Production entrypoint: bring the schema up to date, then serve the API.
# Migrations are idempotent, so running them on every start is safe with one instance.
set -e
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
