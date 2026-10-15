import pytest

from app.config import Settings
from tests.partners import client


def make_settings(**env) -> Settings:
    return Settings(supabase_url="https://example.supabase.co", **env)


@pytest.mark.parametrize(
    "url,expected",
    [
        ("postgresql://u:p@host:5432/db", "postgresql+psycopg://u:p@host:5432/db"),
        (
            "postgres://u:p@host:6543/db?sslmode=require",
            "postgresql+psycopg://u:p@host:6543/db?sslmode=require",
        ),
        ("postgresql+psycopg://u:p@db:5432/db", "postgresql+psycopg://u:p@db:5432/db"),
    ],
)
def test_plain_database_urls_get_the_psycopg_driver(url, expected):
    assert make_settings(database_url=url).database_url == expected


@pytest.mark.parametrize(
    "value,expected",
    [
        ("", []),
        ("https://app.example.com", ["https://app.example.com"]),
        (
            " https://a.example.com/ , https://b.example.com ,",
            ["https://a.example.com", "https://b.example.com"],
        ),
    ],
)
def test_cors_origins_are_parsed_from_a_comma_separated_list(value, expected, monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", value)
    assert make_settings(database_url="postgresql://u:p@h/db").cors_allowed_origins == expected


def test_no_cross_origin_access_by_default():
    response = client.get("/api/health", headers={"Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in response.headers
