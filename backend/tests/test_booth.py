import asyncio
import io

import pytest
from PIL import Image

from app.booth_reset import reset
from app.config import settings
from tests.test_api import generate_sample_image, register


@pytest.fixture
def booth(monkeypatch):
    monkeypatch.setattr(settings, "BOOTH_MODE", True)
    monkeypatch.setattr(settings, "BOOTH_GALLERY_USERNAME", "alice")


def guest_headers(client):
    r = client.post("/api/booth/session")
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def check(client, headers, image=None):
    return client.post("/api/works/check", files={"image": ("x.jpg", image or generate_sample_image(), "image/jpeg")},
                       headers=headers)


def test_booth_is_off_by_default(client, override_db):
    assert client.get("/api/booth").json() == {"enabled": False, "ready": False, "gallery": []}
    assert client.post("/api/booth/session").status_code == 404


def test_no_guest_sessions_until_the_gallery_account_exists(client, override_db, booth):
    assert client.get("/api/booth").json()["ready"] is False
    assert client.post("/api/booth/session").status_code == 503


def test_guest_checks_search_the_booth_gallery(client, signup, booth):
    alice = signup()
    assert register(client, alice, title="Sunset").status_code == 200
    status = client.get("/api/booth").json()
    assert status["ready"] is True and [w["title"] for w in status["gallery"]] == ["Sunset"]

    guest = guest_headers(client)
    assert client.get("/api/auth/me", headers=guest).json()["is_guest"] is True

    result = check(client, guest).json()
    assert result["results"][0]["title"] == "Sunset"
    assert result["results"][0]["is_own"] is False
    assert result["top_verdict"] != "no_match"

    # The guest's history is theirs alone; the gallery owner never sees visitors' uploads.
    assert [c["id"] for c in client.get("/api/checks", headers=guest).json()] == [result["id"]]
    assert client.get("/api/checks", headers=alice).json() == []


def test_guests_get_separate_histories_and_cannot_register(client, signup, booth):
    signup()
    first, second = guest_headers(client), guest_headers(client)
    check(client, first)
    assert client.get("/api/checks", headers=second).json() == []
    r = register(client, first)
    assert r.status_code == 403


def test_guest_sessions_end_when_booth_mode_is_switched_off(client, signup, booth, monkeypatch):
    signup()
    guest = guest_headers(client)
    monkeypatch.setattr(settings, "BOOTH_MODE", False)
    assert client.get("/api/auth/me", headers=guest).status_code == 401


def test_booth_reset_removes_guests_and_their_uploads(client, signup, booth, override_db):
    alice = signup()
    register(client, alice, title="Sunset")
    guest = guest_headers(client)
    check(client, guest)

    summary = asyncio.run(reset(override_db))
    assert summary == {"guests": 1, "checks": 1, "images": 1}
    assert client.get("/api/auth/me", headers=guest).status_code == 401
    assert [w["title"] for w in client.get("/api/works", headers=alice).json()] == ["Sunset"]


def test_heic_upload_is_accepted_and_stored_as_jpeg(client, signup):
    alice = signup()
    buf = io.BytesIO()
    Image.open(io.BytesIO(generate_sample_image())).save(buf, format="HEIF")

    r = register(client, alice, image=buf.getvalue())
    assert r.status_code == 200, r.text
    assert r.json()["image_url"].endswith(".jpg")

    # The JPEG a phone would share later still matches the HEIC original.
    assert check(client, alice).json()["top_verdict"] != "no_match"
