import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from app.main import app
from app.db import get_db
import app.api.auth as auth_module


@pytest.fixture(autouse=True)
def isolated_settings(tmp_path, monkeypatch):
    """Keep test uploads out of backend/uploads and never call real OTS calendars."""
    from app.config import settings
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setattr(settings, "OTS_ENABLED", False)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def override_db():
    mock_db = AsyncMongoMockClient().digital_asset_test
    app.dependency_overrides[get_db] = lambda: mock_db
    yield mock_db
    app.dependency_overrides.clear()


@pytest.fixture
def outbox(monkeypatch):
    """Capture OTP emails instead of sending them."""
    sent = []

    async def fake_send(to, name, code, purpose):
        sent.append({"to": to, "name": name, "code": code, "purpose": purpose})

    monkeypatch.setattr(auth_module, "send_otp_email", fake_send)
    return sent


@pytest.fixture
def signup(client, override_db, outbox):
    """Run the full OTP sign-up flow and return auth headers for the new user."""
    def _signup(username="alice", email="alice@example.com", password="Secret123", full_name="Alice Artist"):
        r = client.post("/api/auth/signup/start", json={
            "full_name": full_name, "username": username, "email": email, "password": password,
        })
        assert r.status_code == 200, r.text
        code = [m for m in outbox if m["to"] == email][-1]["code"]
        r = client.post("/api/auth/signup/verify", json={"email": email, "code": code})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}
    return _signup
