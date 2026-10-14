import logging
import threading
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import engine, user_transaction
from app.households import service
from app.households.router import INVITATION_ATTEMPTS_PER_15_MINUTES
from app.main import app
from tests.tokens import auth_headers

client = TestClient(app)


class Partner:
    """A signed-in user calling the API."""

    def __init__(self):
        self.id = uuid4()
        self.headers = auth_headers(self.id)

    def get(self, path: str):
        return client.get(path, headers=self.headers)

    def post(self, path: str, json: dict | None = None):
        return client.post(path, json=json, headers=self.headers)

    def delete(self, path: str):
        return client.delete(path, headers=self.headers)

    def create_household(self, name="הבית שלנו", display_name="אוריה"):
        return self.post("/api/household", {"name": name, "display_name": display_name})

    def invite(self) -> str:
        response = self.post("/api/household/invitation")
        assert response.status_code == 201
        return response.json()["token"]

    def preview(self, token: str):
        return self.post("/api/invitations/preview", {"token": token})

    def accept(self, token: str, display_name="נועה"):
        return self.post("/api/invitations/accept", {"token": token, "display_name": display_name})


@pytest.fixture
def owner() -> Partner:
    partner = Partner()
    assert partner.create_household().status_code == 201
    return partner


def test_new_user_has_no_household():
    assert Partner().get("/api/household").json() == {"household": None}


def test_create_household_adds_creator_as_member():
    partner = Partner()

    response = partner.create_household(name="  הבית שלנו  ", display_name=" אוריה ")

    assert response.status_code == 201
    household = response.json()["household"]
    assert household["name"] == "הבית שלנו"
    assert [m["display_name"] for m in household["members"]] == ["אוריה"]
    assert household["members"][0]["user_id"] == str(partner.id)
    assert household["pending_invitation"] is None


def test_cannot_create_second_household(owner):
    response = owner.create_household(name="עוד בית")

    assert response.status_code == 409
    assert response.json() == {"detail": "already_member"}


@pytest.mark.parametrize(
    "body",
    [
        {"name": "  ", "display_name": "אוריה"},
        {"name": "הבית", "display_name": ""},
        {"name": "x" * 61, "display_name": "אוריה"},
        {"name": "הבית", "display_name": "x" * 41},
    ],
)
def test_create_household_validates_input(body):
    assert Partner().post("/api/household", body).status_code == 422


def test_invitation_requires_household():
    response = Partner().post("/api/household/invitation")

    assert response.status_code == 409
    assert response.json() == {"detail": "no_household"}


def test_partner_joins_with_invitation(owner):
    token = owner.invite()
    assert len(token) == 43
    assert owner.get("/api/household").json()["household"]["pending_invitation"] is not None
    partner = Partner()

    preview = partner.preview(token)
    joined = partner.accept(token, display_name="נועה")

    assert preview.status_code == 200
    assert preview.json() == {"household_name": "הבית שלנו", "inviter_name": "אוריה"}
    assert joined.status_code == 200
    household = joined.json()["household"]
    assert [m["display_name"] for m in household["members"]] == ["אוריה", "נועה"]
    assert household["pending_invitation"] is None
    # Both partners see the same household.
    assert owner.get("/api/household").json() == partner.get("/api/household").json()


def test_invitation_is_single_use(owner):
    token = owner.invite()
    assert Partner().accept(token).status_code == 200

    stranger = Partner()

    assert stranger.preview(token).json() == {"detail": "invitation_used"}
    assert stranger.accept(token).status_code == 410


def test_household_is_limited_to_two_members(owner):
    assert Partner().accept(owner.invite()).status_code == 200

    response = owner.post("/api/household/invitation")

    assert response.status_code == 409
    assert response.json() == {"detail": "household_full"}


def test_expired_invitation_is_rejected(owner):
    token = owner.invite()
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE household_invitations SET expires_at = now() - interval '1 second'")
        )
    partner = Partner()

    assert partner.preview(token).json() == {"detail": "invitation_expired"}
    assert partner.accept(token).status_code == 410


def test_unknown_and_malformed_tokens(owner):
    partner = Partner()

    assert partner.preview("A" * 43).status_code == 404
    assert partner.preview("too-short").status_code == 422
    assert partner.accept("A" * 42 + "!").status_code == 422


def test_member_cannot_join_another_household(owner):
    other_owner = Partner()
    other_owner.create_household(name="בית אחר")

    response = other_owner.preview(owner.invite())

    assert response.status_code == 409
    assert response.json() == {"detail": "already_member"}


def test_new_invitation_replaces_previous(owner):
    old_token = owner.invite()
    new_token = owner.invite()
    partner = Partner()

    assert partner.preview(old_token).status_code == 404
    assert partner.preview(new_token).status_code == 200


def test_revoke_invitation(owner):
    token = owner.invite()

    assert owner.delete("/api/household/invitation").status_code == 204
    assert owner.get("/api/household").json()["household"]["pending_invitation"] is None
    assert Partner().preview(token).status_code == 404


def test_invitation_attempts_are_rate_limited(owner):
    token = owner.invite()
    guesser = Partner()
    for _ in range(INVITATION_ATTEMPTS_PER_15_MINUTES):
        assert guesser.preview("A" * 43).status_code == 404

    assert guesser.preview(token).status_code == 429
    assert guesser.accept(token).status_code == 429
    # The limit is per user.
    assert Partner().preview(token).status_code == 200


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/household"),
        ("POST", "/api/household"),
        ("POST", "/api/household/invitation"),
        ("DELETE", "/api/household/invitation"),
        ("POST", "/api/invitations/preview"),
        ("POST", "/api/invitations/accept"),
    ],
)
def test_endpoints_require_authentication(method, path):
    assert client.request(method, path).status_code == 401


def test_raw_token_never_reaches_logs(owner, caplog):
    caplog.set_level(logging.DEBUG)
    token = owner.invite()
    partner = Partner()
    partner.preview(token)
    partner.accept(token)
    Partner().accept(token)  # rejected: already used

    assert token not in caplog.text
    assert service.hash_token(token).hex() not in caplog.text


def run_concurrently(*calls):
    """Runs each call in its own thread, released at the same moment. Returns results/errors."""
    barrier = threading.Barrier(len(calls))
    results: list[object] = [None] * len(calls)

    def run(index, call):
        barrier.wait()
        try:
            results[index] = call()
        except service.HouseholdError as error:
            results[index] = error

    threads = [threading.Thread(target=run, args=(i, call)) for i, call in enumerate(calls)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return results


def call_as(user_id, operation, *args):
    def call():
        with user_transaction(user_id) as session:
            return operation(session, *args)

    return call


def test_concurrent_accepts_of_same_invitation_let_only_one_join(owner):
    token = owner.invite()
    first, second = uuid4(), uuid4()

    results = run_concurrently(
        call_as(first, service.accept_invitation, token, "א"),
        call_as(second, service.accept_invitation, token, "ב"),
    )

    errors = [r for r in results if isinstance(r, service.HouseholdError)]
    assert len(errors) == 1
    assert errors[0].code in {"invitation_used", "household_full"}
    assert len(owner.get("/api/household").json()["household"]["members"]) == 2


def test_concurrent_household_creation_by_same_user_creates_one():
    user_id = uuid4()

    results = run_concurrently(
        call_as(user_id, service.create_household, "בית 1", "א"),
        call_as(user_id, service.create_household, "בית 2", "א"),
    )

    errors = [r for r in results if isinstance(r, service.HouseholdError)]
    assert [e.code for e in errors] == ["already_member"]
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT count(*) FROM households")) == 1


def test_concurrent_invitations_leave_one_pending(owner):
    results = run_concurrently(
        call_as(owner.id, service.create_invitation),
        call_as(owner.id, service.create_invitation),
    )

    assert not any(isinstance(r, service.HouseholdError) for r in results)
    with engine.connect() as connection:
        pending = connection.scalar(
            text("SELECT count(*) FROM household_invitations WHERE accepted_at IS NULL")
        )
    assert pending == 1
