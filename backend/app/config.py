from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode

# Hosting providers (Supabase, Render, ...) hand out plain PostgreSQL URLs; SQLAlchemy
# needs the driver in the scheme.
_PLAIN_SCHEMES = ("postgresql://", "postgres://")
_DRIVER_SCHEME = "postgresql+psycopg://"


class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    # Browser origins allowed to call the API from another domain, comma-separated
    # (e.g. "https://app.example.com"). Empty: no cross-origin access, as when the
    # frontend is served from the same domain or through a dev proxy.
    cors_allowed_origins: Annotated[list[str], NoDecode] = []
    # Interactive API docs (/docs, /redoc, /openapi.json). Off unless enabled, so a
    # deployment never exposes them by accident; local development turns them on.
    api_docs_enabled: bool = False

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str) -> str:
        for scheme in _PLAIN_SCHEMES:
            if url.startswith(scheme):
                return _DRIVER_SCHEME + url.removeprefix(scheme)
        return url

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
