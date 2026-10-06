import asyncio
import time

import httpx
import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.deps import get_embedder
from app.config import Settings
from app.core.storage import LocalStorage
from app.db import make_sync_engine
from app.limiter import limiter
from app.main import create_app
from app.models import Image as ImageModel
from tests.fakes import FakeEmbedder
from tests.images import photo_like, to_bytes


@pytest.mark.asyncio
@pytest.mark.parametrize("run_idx", range(5))
async def test_registry_race_condition(
    async_db_url, migrated_db, clean_db, tmp_path, monkeypatch, db_url, run_idx
):
    settings = Settings(
        database_url=async_db_url,
        provnet_skip_models=True,
        storage_dir=str(tmp_path),
    )
    app = create_app(settings)
    app.dependency_overrides[get_embedder] = lambda: FakeEmbedder()
    limiter.enabled = False

    orig_write_png = LocalStorage.write_png

    def delayed_write_png(self, image_id, img):
        time.sleep(0.3)
        return orig_write_png(self, image_id, img)

    monkeypatch.setattr(LocalStorage, "write_png", delayed_write_png)

    # Two near-identical uploads with DIFFERENT bytes
    img = photo_like(7 + run_idx)
    png_bytes = to_bytes(img, "PNG")
    jpg_bytes = to_bytes(img, "JPEG", quality=95)

    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        req1 = client.post(
            "/api/register",
            files={"file": ("race_1.png", png_bytes, "image/png")},
            data={"owner_name": "Racer 1"},
        )
        req2 = client.post(
            "/api/register",
            files={"file": ("race_2.jpg", jpg_bytes, "image/jpeg")},
            data={"owner_name": "Racer 2"},
        )
        res1, res2 = await asyncio.gather(req1, req2)

    status_codes = sorted([res1.status_code, res2.status_code])
    assert status_codes == [201, 409], (
        f"Run {run_idx} failed: {res1.status_code} ({res1.text}) and {res2.status_code} ({res2.text})"
    )

    # DB check: count(*) == 1
    sync_url = (
        db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if db_url.startswith("postgresql://")
        else db_url
    )
    engine = make_sync_engine(sync_url)
    with Session(engine) as session:
        count = session.scalar(select(text("count(*)")).select_from(ImageModel))
        assert count == 1, f"Expected exactly 1 image in DB, got {count}"

    # Storage check: exactly 1 PNG and 1 thumb
    assert len(list(tmp_path.glob("*.png"))) == 1
    assert len(list((tmp_path / "thumbs").glob("*.png"))) == 1


@pytest.mark.asyncio
async def test_registry_race_control_without_lock(
    async_db_url, migrated_db, clean_db, tmp_path, monkeypatch, db_url
):
    """CONTROL TEST: Proves that disabling the advisory lock allows the race to occur (producing two 201s)."""
    import app.core.registry as reg_module

    # Monkeypatch Q5_REGISTER_LOCK to no-op SELECT 1
    monkeypatch.setattr(reg_module, "Q5_REGISTER_LOCK", text("SELECT 1"))

    orig_write_png = LocalStorage.write_png

    def delayed_write_png(self, image_id, img):
        time.sleep(0.3)
        return orig_write_png(self, image_id, img)

    monkeypatch.setattr(LocalStorage, "write_png", delayed_write_png)

    img = photo_like(99)
    png_bytes = to_bytes(img, "PNG")
    jpg_bytes = to_bytes(img, "JPEG", quality=95)

    settings = Settings(
        database_url=async_db_url,
        provnet_skip_models=True,
        storage_dir=str(tmp_path),
    )
    app = create_app(settings)
    app.dependency_overrides[get_embedder] = lambda: FakeEmbedder()
    limiter.enabled = False

    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        req1 = client.post(
            "/api/register",
            files={"file": ("race_ctrl_1.png", png_bytes, "image/png")},
            data={"owner_name": "Racer 1"},
        )
        req2 = client.post(
            "/api/register",
            files={"file": ("race_ctrl_2.jpg", jpg_bytes, "image/jpeg")},
            data={"owner_name": "Racer 2"},
        )
        res1, res2 = await asyncio.gather(req1, req2)

    # Without the lock, both pass Q4_CONFLICT check concurrently and both get 201
    assert res1.status_code == 201
    assert res2.status_code == 201

    sync_url = (
        db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if db_url.startswith("postgresql://")
        else db_url
    )
    engine = make_sync_engine(sync_url)
    with Session(engine) as session:
        count = session.scalar(select(text("count(*)")).select_from(ImageModel))
        assert count == 2, f"Control test expected 2 images in DB, got {count}"
