from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app.auth import get_key_resolver
from app.main import app
from tests.tokens import make_token

OTHER_PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())

client = TestClient(app)


def get_me(token: str):
    return client.get("/api/me", headers={"Authorization": f"Bearer {token}"})


def test_valid_token_returns_current_user():
    user_id = str(uuid4())

    response = get_me(make_token(sub=user_id))

    assert response.status_code == 200
    assert response.json() == {"id": user_id, "email": "partner@example.com"}


def test_missing_token_is_rejected():
    assert client.get("/api/me").status_code == 401


@pytest.mark.parametrize(
    "token",
    [
        pytest.param(make_token(exp=datetime.now(UTC) - timedelta(minutes=1)), id="expired"),
        pytest.param(make_token(aud="anon"), id="wrong-audience"),
        pytest.param(make_token(iss="https://evil.example.com/auth/v1"), id="wrong-issuer"),
        pytest.param(make_token(sub="not-a-uuid"), id="invalid-subject"),
        pytest.param(make_token(private_key=OTHER_PRIVATE_KEY), id="wrong-signing-key"),
        pytest.param(
            make_token(private_key="a-shared-secret-at-least-32-bytes-long", algorithm="HS256"),
            id="hs256",
        ),
        pytest.param(make_token(private_key=None, algorithm="none"), id="unsigned"),
        pytest.param("not-a-jwt", id="garbage"),
    ],
)
def test_invalid_token_is_rejected(token):
    assert get_me(token).status_code == 401


def test_jwks_outage_returns_503():
    def unreachable_jwks(token):
        raise jwt.PyJWKClientConnectionError("JWKS unreachable")

    app.dependency_overrides[get_key_resolver] = lambda: unreachable_jwks

    assert get_me(make_token()).status_code == 503
