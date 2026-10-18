"""The two Supabase Auth calls account deletion needs. Tests replace this client."""

import json
import logging
from typing import Annotated
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID

from fastapi import Depends, status

from app.config import settings
from app.errors import AppError

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 10


class AuthServiceError(AppError):
    def __init__(self) -> None:
        super().__init__("auth_service_unavailable", status.HTTP_503_SERVICE_UNAVAILABLE)


class SupabaseAuth:
    def __init__(self, url: str, publishable_key: str, secret_key: str):
        self._url = f"{url}/auth/v1"
        self._publishable_key = publishable_key
        self._secret_key = secret_key

    def password_owner(self, email: str, password: str) -> UUID | None:
        """The user id these credentials sign in as, or None if they are wrong."""
        try:
            body = self._call(
                "POST",
                "/token?grant_type=password",
                self._publishable_key,
                {"email": email, "password": password},
            )
        except HTTPError as error:
            if error.code in (400, 401, 422):
                return None
            raise self._unavailable(error) from error
        except URLError as error:
            raise self._unavailable(error) from error
        return UUID(body["user"]["id"])

    def delete_user(self, user_id: UUID) -> None:
        try:
            self._call("DELETE", f"/admin/users/{user_id}", self._secret_key)
        except (HTTPError, URLError) as error:
            raise self._unavailable(error) from error

    def _call(self, method: str, path: str, key: str, payload: dict | None = None) -> dict:
        # A secret key may also go in Authorization only when it equals the apikey header.
        headers = {"apikey": key, "Authorization": f"Bearer {key}"}
        data = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(payload).encode()
        request = Request(self._url + path, data=data, method=method, headers=headers)
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            content = response.read()
        return json.loads(content) if content else {}

    @staticmethod
    def _unavailable(error: Exception) -> AuthServiceError:
        # Never log the request itself: it carries a password or the secret key.
        logger.error("Supabase Auth call failed: %s", getattr(error, "code", type(error).__name__))
        return AuthServiceError()


def get_supabase_auth() -> SupabaseAuth:
    if not (settings.supabase_publishable_key and settings.supabase_secret_key):
        raise AppError("account_deletion_not_configured", status.HTTP_503_SERVICE_UNAVAILABLE)
    return SupabaseAuth(
        settings.supabase_url, settings.supabase_publishable_key, settings.supabase_secret_key
    )


SupabaseAuthClient = Annotated[SupabaseAuth, Depends(get_supabase_auth)]
