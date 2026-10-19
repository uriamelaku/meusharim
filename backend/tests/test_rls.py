"""Row level security, checked directly in PostgreSQL as the backend's request role."""

from uuid import uuid4

import pytest
from psycopg import errors as pg_errors
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.db import APP_ROLE, engine, user_transaction
from app.households import service


def create_household_for(user_id, name="הבית") -> None:
    with user_transaction(user_id) as session:
        service.create_household(session, name, "שם", "he")


@pytest.fixture
def two_households():
    user_a, user_b = uuid4(), uuid4()
    create_household_for(user_a, "בית א")
    create_household_for(user_b, "בית ב")
    with user_transaction(user_b) as session:
        service.create_invitation(session)
    return user_a, user_b


def assert_permission_denied(user_id, sql: str) -> None:
    with pytest.raises(DBAPIError) as error, user_transaction(user_id) as session:
        session.execute(text(sql))
    assert isinstance(error.value.orig, pg_errors.InsufficientPrivilege)


def test_requests_run_as_app_role():
    with user_transaction(uuid4()) as session:
        assert session.scalar(text("SELECT current_user")) == APP_ROLE


def test_user_sees_only_own_household(two_households):
    user_a, _ = two_households
    with user_transaction(user_a) as session:
        assert session.scalars(text("SELECT name FROM households")).all() == ["בית א"]
        assert session.scalar(text("SELECT count(*) FROM household_members")) == 1
        assert session.scalar(text("SELECT count(*) FROM household_invitations")) == 0


def test_without_claims_no_rows_are_visible(two_households):
    with Session(engine) as session, session.begin():
        session.execute(text(f"SET LOCAL ROLE {APP_ROLE}"))
        assert session.scalar(text("SELECT count(*) FROM households")) == 0
        assert session.scalar(text("SELECT count(*) FROM household_members")) == 0


def test_cannot_delete_other_households_invitation(two_households):
    user_a, user_b = two_households
    with user_transaction(user_a) as session:
        service.revoke_pending_invitation(session)
    with user_transaction(user_b) as session:
        assert service.get_my_household(session).pending_invitation is not None


@pytest.mark.parametrize(
    "sql",
    [
        pytest.param(
            "INSERT INTO households (name, created_by) VALUES ('x', gen_random_uuid())",
            id="insert-household",
        ),
        pytest.param(
            "INSERT INTO household_members (household_id, user_id, display_name)"
            " SELECT id, gen_random_uuid(), 'x' FROM households",
            id="insert-member",
        ),
        pytest.param("UPDATE households SET name = 'x'", id="update-household"),
        pytest.param("SELECT token_hash FROM household_invitations", id="read-token-hash"),
        pytest.param("SELECT count(*) FROM app.invitation_attempts", id="read-attempts"),
        pytest.param(
            "SELECT app.find_valid_invitation('\\x00'::bytea, false)", id="internal-function"
        ),
    ],
)
def test_direct_writes_and_internals_are_not_granted(two_households, sql):
    user_a, _ = two_households
    assert_permission_denied(user_a, sql)


APP_TABLES = [
    "households",
    "household_members",
    "household_invitations",
    "categories",
    "transactions",
    "schedules",
    "budgets",
    "savings_goals",
]


@pytest.mark.parametrize("api_role", ["authenticated", "anon"])
@pytest.mark.parametrize("table", APP_TABLES)
def test_supabase_api_roles_cannot_touch_app_data(two_households, api_role, table):
    """Supabase's Data API runs as these roles; even a valid user JWT must not reach the
    tables there, so all data access goes through the backend."""
    user_a, _ = two_households
    claims = f'{{"sub": "{user_a}", "role": "{api_role}"}}'
    with pytest.raises(DBAPIError) as error, Session(engine) as session, session.begin():
        session.execute(text(f"SET LOCAL ROLE {api_role}"))
        session.execute(text("SELECT set_config('request.jwt.claims', :c, true)"), {"c": claims})
        session.execute(text(f"SELECT 1 FROM public.{table} LIMIT 1"))
    assert isinstance(error.value.orig, pg_errors.InsufficientPrivilege)


@pytest.mark.parametrize("api_role", ["authenticated", "anon"])
def test_supabase_api_roles_have_no_privileges_left(api_role):
    with Session(engine) as session:
        tables = session.scalars(
            text(
                "SELECT table_name FROM information_schema.role_table_grants"
                " WHERE grantee = :role AND table_schema = 'public'"
                " UNION SELECT table_name FROM information_schema.column_privileges"
                " WHERE grantee = :role AND table_schema = 'public'"
            ),
            {"role": api_role},
        ).all()
        functions = session.scalar(
            text(
                "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace"
                " WHERE n.nspname = 'app' AND has_function_privilege(:role, p.oid, 'EXECUTE')"
            ),
            {"role": api_role},
        )
    assert tables == []
    assert functions == 0
