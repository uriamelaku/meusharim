from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.main import app

client = TestClient(app)


def test_health_ok_when_database_reachable():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_health_503_when_database_unreachable(monkeypatch):
    def fail_connect():
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    monkeypatch.setattr("app.main.engine.connect", fail_connect)

    response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "unavailable"}
