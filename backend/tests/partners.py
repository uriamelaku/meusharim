"""API clients for signed-in test users."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from tests.tokens import auth_headers

client = TestClient(app)


class Partner:
    """A signed-in user calling the API."""

    def __init__(self):
        self.id = uuid4()
        self.headers = auth_headers(self.id)

    def get(self, path: str, params: dict | None = None):
        return client.get(path, params=params, headers=self.headers)

    def post(self, path: str, json: dict | None = None, params: dict | None = None):
        return client.post(path, json=json, params=params, headers=self.headers)

    def patch(self, path: str, json: dict):
        return client.patch(path, json=json, headers=self.headers)

    def put(self, path: str, json: dict, params: dict | None = None):
        return client.put(path, json=json, params=params, headers=self.headers)

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

    def ok(self, method: str, path: str, *args, **kwargs):
        """Calls the API and returns the JSON body, failing the test on an error status."""
        response = getattr(self, method)(path, *args, **kwargs)
        assert response.status_code < 300, response.text
        return response.json() if response.content else None

    def category_id(self, name: str) -> str:
        categories = self.ok("get", "/api/categories")
        return next(c["id"] for c in categories if c["name"] == name and not c["archived"])


def make_couple() -> tuple[Partner, Partner]:
    owner, partner = Partner(), Partner()
    assert owner.create_household().status_code == 201
    assert partner.accept(owner.invite()).status_code == 200
    return owner, partner
