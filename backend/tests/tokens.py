"""Test-only JWTs, signed with a key the app accepts only through a dependency override."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec

from app.auth import TOKEN_AUDIENCE, TOKEN_ISSUER

TEST_PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())


def make_token(private_key=TEST_PRIVATE_KEY, algorithm="ES256", **overrides) -> str:
    claims = {
        "sub": str(uuid4()),
        "email": "partner@example.com",
        "aud": TOKEN_AUDIENCE,
        "iss": TOKEN_ISSUER,
        "exp": datetime.now(UTC) + timedelta(minutes=5),
        **overrides,
    }
    return jwt.encode(claims, private_key, algorithm=algorithm)


def auth_headers(user_id: UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub=str(user_id))}"}
