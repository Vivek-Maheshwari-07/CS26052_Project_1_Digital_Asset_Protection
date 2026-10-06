import re

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_health_local_db(app_client):
    r = app_client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["database"] == "ok"
    assert re.match(r"^\d+\.\d+", data["pgvector"])
    assert isinstance(data["registered_images"], int)
    assert data["models_loaded"] == {"clip": False, "dino": False}


def test_health_degraded_unreachable_db(tmp_path):
    settings = Settings(
        database_url="postgresql+asyncpg://provnet:provnet@127.0.0.1:1/provnet",
        provnet_skip_models=True,
        storage_dir=str(tmp_path),
    )
    app = create_app(settings)
    with TestClient(app) as client:
        r = client.get("/api/health")
        assert r.status_code == 503
        data = r.json()
        assert data["status"] == "degraded"
        assert data["database"] == "unavailable"
        assert data["pgvector"] is None
        assert data["registered_images"] is None


def test_not_found_route(app_client):
    r = app_client.get("/api/unknown_nonexistent_route")
    assert r.status_code == 404
    data = r.json()
    assert data["error"] == "not_found"
