import os

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

# Tests use a separate database next to the development one. This must run before
# any app module reads DATABASE_URL.
_dev_url = make_url(os.environ["DATABASE_URL"])
_test_url = _dev_url.set(database=f"{_dev_url.database}_test")
os.environ["DATABASE_URL"] = _test_url.render_as_string(hide_password=False)

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402

from app.auth import get_key_resolver  # noqa: E402
from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402
from tests.tokens import TEST_PRIVATE_KEY  # noqa: E402


def _simulate_supabase_api_roles() -> None:
    """Like Supabase: the Data API roles exist before any migration, and new tables in
    `public` are granted to them by default. Migrations must take all of that away."""
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
                    CREATE ROLE anon NOLOGIN;
                  END IF;
                  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
                    CREATE ROLE authenticated NOLOGIN;
                  END IF;
                END
                $$;
                GRANT anon, authenticated TO current_user;
                GRANT USAGE ON SCHEMA public TO anon, authenticated;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public
                  GRANT ALL ON TABLES TO anon, authenticated;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public
                  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
                """
            )
        )


@pytest.fixture(scope="session", autouse=True)
def test_database():
    admin_engine = create_engine(_dev_url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as connection:
        exists = connection.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": _test_url.database}
        )
        if not exists:
            connection.execute(text(f'CREATE DATABASE "{_test_url.database}"'))
    admin_engine.dispose()
    if not exists:
        _simulate_supabase_api_roles()
    command.upgrade(Config("alembic.ini"), "head")
    yield


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE households, household_members, household_invitations,"
                " app.invitation_attempts CASCADE"
            )
        )


@pytest.fixture(autouse=True)
def use_test_signing_key():
    public_key = TEST_PRIVATE_KEY.public_key()
    app.dependency_overrides[get_key_resolver] = lambda: lambda token: public_key
    yield
    app.dependency_overrides.clear()
