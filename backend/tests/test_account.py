from uuid import UUID

import pytest
from sqlalchemy import text

from app.account.supabase_auth import AuthServiceError, get_supabase_auth
from app.config import settings
from app.db import engine
from app.main import app
from tests.partners import Partner, make_couple

PASSWORD = "correct horse"
EMAIL = "partner@example.com"  # the email in every test token


class FakeSupabaseAuth:
    """Accepts PASSWORD for every user; records deleted users."""

    def __init__(self):
        self.deleted: list[UUID] = []
        self.fail_delete = False
        self.signing_in: UUID | None = None

    def password_owner(self, email: str, password: str) -> UUID | None:
        return self.signing_in if password == PASSWORD else None

    def delete_user(self, user_id: UUID) -> None:
        if self.fail_delete:
            raise AuthServiceError()
        self.deleted.append(user_id)


@pytest.fixture
def supabase():
    fake = FakeSupabaseAuth()
    app.dependency_overrides[get_supabase_auth] = lambda: fake
    return fake


def delete_account(user: Partner, supabase: FakeSupabaseAuth, email=EMAIL, password=PASSWORD):
    supabase.signing_in = user.id
    return user.post("/api/account/delete", {"email": email, "password": password})


def household_count() -> int:
    with engine.connect() as connection:
        return connection.scalar(text("SELECT count(*) FROM households"))


def test_partner_leaves_and_data_stays_with_the_other(supabase):
    owner, partner = make_couple()
    paid = partner.ok(
        "post",
        "/api/transactions",
        {"kind": "expense", "amount": "80", "occurred_on": "2026-10-10", "status": "completed",
         "category_id": partner.category_id("מזון"), "party_user_id": str(partner.id)},
    )  # fmt: skip

    response = delete_account(partner, supabase)

    assert response.status_code == 204
    assert supabase.deleted == [partner.id]
    assert partner.ok("get", "/api/household")["household"] is None
    household = owner.ok("get", "/api/household")["household"]
    assert [m["user_id"] for m in household["members"]] == [str(owner.id)]
    kept = owner.ok("get", f"/api/transactions/{paid['id']}")
    assert kept["amount"] == "80.00" and kept["party_user_id"] is None  # now joint


def test_remaining_partner_can_invite_again(supabase):
    owner, partner = make_couple()
    delete_account(partner, supabase)
    assert Partner().accept(owner.invite()).status_code == 200


def test_last_member_deletes_the_household(supabase):
    owner = Partner()
    owner.create_household()
    assert household_count() == 1

    assert delete_account(owner, supabase).status_code == 204

    assert household_count() == 0
    assert supabase.deleted == [owner.id]


def test_user_without_household_can_delete_account(supabase):
    user = Partner()
    assert delete_account(user, supabase).status_code == 204
    assert supabase.deleted == [user.id]


def test_wrong_password_changes_nothing(supabase):
    owner, partner = make_couple()

    response = delete_account(partner, supabase, password="wrong")

    assert response.status_code == 403
    assert response.json()["detail"] == "wrong_password"
    assert supabase.deleted == []
    assert len(owner.ok("get", "/api/household")["household"]["members"]) == 2


def test_password_of_another_account_is_rejected(supabase):
    _, partner = make_couple()
    supabase.signing_in = Partner().id  # the credentials belong to someone else
    response = partner.post("/api/account/delete", {"email": EMAIL, "password": PASSWORD})
    assert response.status_code == 403
    assert supabase.deleted == []


@pytest.mark.parametrize("email", ["other@example.com", "", "partner@example"])
def test_email_must_match_the_signed_in_user(supabase, email):
    _, partner = make_couple()
    response = delete_account(partner, supabase, email=email)
    assert response.status_code == 422
    assert supabase.deleted == []


def test_email_match_ignores_case_and_spaces(supabase):
    user = Partner()
    assert delete_account(user, supabase, email="  Partner@Example.COM ").status_code == 204


def test_failed_auth_deletion_keeps_the_data(supabase):
    owner, partner = make_couple()
    supabase.fail_delete = True

    response = delete_account(partner, supabase)

    assert response.status_code == 503
    assert len(owner.ok("get", "/api/household")["household"]["members"]) == 2
    assert partner.ok("get", "/api/household")["household"] is not None


def test_not_configured_answers_503(monkeypatch):
    # Independent of the developer's .env: the keys may be set there for real logins.
    monkeypatch.setattr(settings, "supabase_secret_key", "")
    user = Partner()
    response = user.post("/api/account/delete", {"email": EMAIL, "password": PASSWORD})
    assert response.status_code == 503
    assert response.json()["detail"] == "account_deletion_not_configured"


def test_requires_sign_in(supabase):
    from fastapi.testclient import TestClient

    response = TestClient(app).post(
        "/api/account/delete", json={"email": EMAIL, "password": PASSWORD}
    )
    assert response.status_code == 401
