import logging
from collections.abc import Callable
from typing import Annotated, Any
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

TOKEN_AUDIENCE = "authenticated"
TOKEN_ISSUER = f"{settings.supabase_url}/auth/v1"
ALLOWED_ALGORITHMS = ["ES256", "RS256"]

KeyResolver = Callable[[str], Any]

_bearer = HTTPBearer(auto_error=False)
_jwks_client = jwt.PyJWKClient(f"{TOKEN_ISSUER}/.well-known/jwks.json")


class CurrentUser(BaseModel):
    id: UUID
    email: str | None


def resolve_key_from_jwks(token: str) -> Any:
    return _jwks_client.get_signing_key_from_jwt(token).key


def get_key_resolver() -> KeyResolver:
    """Returns how to find a token's verification key. Tests override this dependency."""
    return resolve_key_from_jwks


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing access token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    resolve_key: Annotated[KeyResolver, Depends(get_key_resolver)],
) -> CurrentUser:
    if credentials is None:
        raise _unauthorized()
    token = credentials.credentials
    try:
        claims = jwt.decode(
            token,
            resolve_key(token),
            algorithms=ALLOWED_ALGORITHMS,
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUER,
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
    except jwt.PyJWKClientConnectionError as error:
        logger.exception("Could not fetch Supabase JWKS")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        ) from error
    except jwt.PyJWTError as error:
        raise _unauthorized() from error
    try:
        return CurrentUser(id=claims["sub"], email=claims.get("email"))
    except ValueError as error:
        raise _unauthorized() from error
