import io
import uuid

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.config import Settings, get_config
from app.core.hasher import compute_hashes
from app.core.storage import LocalStorage
from app.db import make_sync_engine
from app.limiter import limiter
from app.main import create_app
from app.models import Image as ImageModel
from app.schemas import ConflictResponse, RegisterResponse
from tests.fakes import FakeEmbedder
from tests.images import flat, photo_like, to_bytes


def test_register_new_image_success(register_client, db_url):
    img = photo_like(1)
    img_bytes = to_bytes(img, "JPEG", quality=95)

    res = register_client.post(
        "/api/register",
        files={"file": ("photo1.jpg", img_bytes, "image/jpeg")},
        data={"owner_name": "Alice Developer"},
    )
    assert res.status_code == 201, res.text
    data = res.json()

    # 1. Body validates as RegisterResponse
    resp_obj = RegisterResponse.model_validate(data)
    assert resp_obj.owner_name == "Alice Developer"
    assert data["registered_at"].endswith("Z")
    assert resp_obj.width == img.width
    assert resp_obj.height == img.height
    assert resp_obj.record_url == f"/api/images/{resp_obj.image_id}/record"

    # 2. DB row read through ORM
    sync_url = (
        db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if db_url.startswith("postgresql://")
        else db_url
    )
    engine = make_sync_engine(sync_url)
    with Session(engine) as session:
        row = session.scalar(select(ImageModel).where(ImageModel.id == resp_obj.image_id))
        assert row is not None
        assert row.phash == resp_obj.fingerprints.phash
        assert row.dhash == resp_obj.fingerprints.dhash
        assert row.ahash == resp_obj.fingerprints.ahash
        assert row.whash == resp_obj.fingerprints.whash
        assert row.sha256 == resp_obj.sha256
        assert row.config_version == "2026.10-1"
        fake_emb = FakeEmbedder()
        assert row.clip_model == fake_emb.clip_id
        assert row.dino_model == fake_emb.dino_id

    # 3. Storage files
    storage_dir = register_client.storage_dir
    full_png = storage_dir / f"{resp_obj.image_id}.png"
    thumb_png = storage_dir / "thumbs" / f"{resp_obj.image_id}.png"
    assert full_png.exists()
    assert thumb_png.exists()

    with Image.open(full_png) as saved_full:
        assert saved_full.format == "PNG"
        # No EXIF metadata
        assert saved_full.getexif() == {} or len(saved_full.getexif()) == 0
        assert "icc_profile" not in saved_full.info

    with Image.open(thumb_png) as saved_thumb:
        assert saved_thumb.format == "PNG"
        assert max(saved_thumb.size) == 320


def test_register_duplicate_sha256(register_client):
    img = photo_like(10)
    img_bytes = to_bytes(img, "JPEG", quality=95)

    # First registration
    res1 = register_client.post(
        "/api/register",
        files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        data={"owner_name": "Secret Owner"},
    )
    assert res1.status_code == 201

    # Same bytes again
    res2 = register_client.post(
        "/api/register",
        files={"file": ("test_dup.jpg", img_bytes, "image/jpeg")},
        data={"owner_name": "Different User"},
    )
    assert res2.status_code == 409
    data = res2.json()

    # Validates as ConflictResponse
    conflict = ConflictResponse.model_validate(data)
    assert conflict.error == "near_duplicate"
    assert conflict.reason == "sha256"
    assert conflict.existing.hamming.phash == 0
    assert conflict.existing.hamming.dhash == 0
    assert conflict.existing.hamming.ahash == 0
    assert conflict.existing.hamming.whash == 0
    assert "Secret Owner" not in res2.text
    assert "owner_name" not in res2.text


def test_register_jpeg_reencode_conflict_hash(register_client):
    img = photo_like(20)
    orig_bytes = to_bytes(img, "PNG")

    res1 = register_client.post(
        "/api/register",
        files={"file": ("orig.png", orig_bytes, "image/png")},
    )
    assert res1.status_code == 201

    # JPEG q90 re-encode of the same image (different SHA-256, but small Hamming distance)
    reencoded_bytes = to_bytes(img, "JPEG", quality=90)
    res2 = register_client.post(
        "/api/register",
        files={"file": ("reencoded.jpg", reencoded_bytes, "image/jpeg")},
    )
    assert res2.status_code == 409
    data = res2.json()
    conflict = ConflictResponse.model_validate(data)
    assert conflict.reason == "hash"


def test_register_low_detail_near_copy(register_client):
    cfg = get_config()
    base = Image.blend(flat(128, size=(640, 480)), photo_like(5, size=(640, 480)), 0.08)
    hashes = compute_hashes(base, cfg)
    assert hashes.low_detail, f"Expected low_detail=True, got std={hashes.grey_std}"

    base_bytes = to_bytes(base, "PNG")
    res1 = register_client.post(
        "/api/register",
        files={"file": ("low_detail.png", base_bytes, "image/png")},
    )
    assert res1.status_code == 201

    # Re-encoded JPEG
    reencoded_bytes = to_bytes(base, "JPEG", quality=90)
    res2 = register_client.post(
        "/api/register",
        files={"file": ("low_detail_re.jpg", reencoded_bytes, "image/jpeg")},
    )
    # Low detail images bypass perceptual hash matching, so either 201 or 409 dino_cosine
    if res2.status_code == 409:
        data = res2.json()
        assert data["reason"] != "hash"
        assert data["reason"] in ("dino_cosine", "sha256")
    else:
        assert res2.status_code == 201


def test_register_unrelated_images(register_client):
    img1 = photo_like(1)
    img2 = photo_like(2)

    res1 = register_client.post(
        "/api/register",
        files={"file": ("img1.jpg", to_bytes(img1, "JPEG"), "image/jpeg")},
    )
    assert res1.status_code == 201

    res2 = register_client.post(
        "/api/register",
        files={"file": ("img2.jpg", to_bytes(img2, "JPEG"), "image/jpeg")},
    )
    assert res2.status_code == 201


def test_owner_name_validation(register_client, db_url):
    img = photo_like(30)
    img_bytes = to_bytes(img, "JPEG")

    # 1. 101 characters -> 422
    res_long = register_client.post(
        "/api/register",
        files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        data={"owner_name": "A" * 101},
    )
    assert res_long.status_code == 422
    assert res_long.json()["error"] == "validation_error"

    # 2. Whitespace owner_name -> stored as NULL
    res_space = register_client.post(
        "/api/register",
        files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        data={"owner_name": "   "},
    )
    assert res_space.status_code == 201
    data = res_space.json()
    assert data["owner_name"] is None

    sync_url = (
        db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if db_url.startswith("postgresql://")
        else db_url
    )
    engine = make_sync_engine(sync_url)
    with Session(engine) as session:
        row = session.scalar(select(ImageModel).where(ImageModel.id == uuid.UUID(data["image_id"])))
        assert row.owner_name is None


def test_unsupported_format_and_too_large(register_client):
    storage_dir = register_client.storage_dir

    # 1. GIF format -> 415
    gif_buf = io.BytesIO()
    Image.new("RGB", (100, 100), (255, 0, 0)).save(gif_buf, format="GIF")
    res_gif = register_client.post(
        "/api/register",
        files={"file": ("test.gif", gif_buf.getvalue(), "image/gif")},
    )
    assert res_gif.status_code == 415
    assert res_gif.json()["error"] == "unsupported_format"

    # 2. > 10 MB payload -> 413
    oversized = b"0" * (11 * 1024 * 1024)
    res_large = register_client.post(
        "/api/register",
        files={"file": ("huge.jpg", oversized, "image/jpeg")},
    )
    assert res_large.status_code == 413
    assert res_large.json()["error"] == "too_large"

    # Verify nothing written to storage
    assert list(storage_dir.glob("*.png")) == []


def test_models_not_loaded_returns_busy(app_client):
    # app_client has provnet_skip_models=True and NO embedder override
    img = photo_like(40)
    res = app_client.post(
        "/api/register",
        files={"file": ("test.jpg", to_bytes(img, "JPEG"), "image/jpeg")},
    )
    assert res.status_code == 503
    assert res.json()["error"] == "busy"


def test_fault_injection_write_thumb_failure(register_client, monkeypatch, db_url):
    storage_dir = register_client.storage_dir

    def fail_write_thumb(self, image_id, img):
        raise RuntimeError("Simulated thumbnail write failure")

    monkeypatch.setattr(LocalStorage, "write_thumb", fail_write_thumb)

    img = photo_like(50)
    res = register_client.post(
        "/api/register",
        files={"file": ("fail.jpg", to_bytes(img, "JPEG"), "image/jpeg")},
    )
    assert res.status_code == 500
    assert res.json()["error"] == "internal_error"

    # No images row in DB
    sync_url = (
        db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if db_url.startswith("postgresql://")
        else db_url
    )
    engine = make_sync_engine(sync_url)
    with Session(engine) as session:
        count = session.scalar(select(text("count(*)")).select_from(ImageModel))
        assert count == 0

    # No files left in storage
    assert list(storage_dir.glob("*.png")) == []
    assert list((storage_dir / "thumbs").glob("*.png")) == []


def test_unique_sha256_backstop(register_client, monkeypatch, db_url):
    import app.core.registry as reg

    # Monkeypatch Q4_CONFLICT to return NO rows so the check passes and hits DB UNIQUE constraint
    fake_q4 = text(reg.Q4_CONFLICT.text.replace("WHERE ", "WHERE false AND ")).bindparams(
        *reg.Q4_CONFLICT._bindparams.values()
    )

    img = photo_like(60)
    img_bytes = to_bytes(img, "JPEG")

    # 1. First registration succeeds normally
    res1 = register_client.post(
        "/api/register",
        files={"file": ("orig.jpg", img_bytes, "image/jpeg")},
    )
    assert res1.status_code == 201

    # 2. Patch Q4 so second registration skips Q4 detection and hits the DB UNIQUE constraint
    monkeypatch.setattr(reg, "Q4_CONFLICT", fake_q4)

    res2 = register_client.post(
        "/api/register",
        files={"file": ("dup.jpg", img_bytes, "image/jpeg")},
    )
    assert res2.status_code == 409
    assert res2.json()["reason"] == "sha256"

    # Exactly 1 row in DB
    sync_url = (
        db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if db_url.startswith("postgresql://")
        else db_url
    )
    engine = make_sync_engine(sync_url)
    with Session(engine) as session:
        count = session.scalar(select(text("count(*)")).select_from(ImageModel))
        assert count == 1

    # Exactly 1 full PNG and 1 thumb in storage
    storage_dir = register_client.storage_dir
    assert len(list(storage_dir.glob("*.png"))) == 1
    assert len(list((storage_dir / "thumbs").glob("*.png"))) == 1


def test_rate_limit_exceeded(async_db_url, migrated_db, clean_db, tmp_path):
    from app.api.deps import get_embedder

    settings = Settings(
        database_url=async_db_url,
        provnet_skip_models=True,
        storage_dir=str(tmp_path),
    )
    app = create_app(settings)
    app.dependency_overrides[get_embedder] = lambda: FakeEmbedder()

    # Enable limiter and reset
    limiter.enabled = True
    limiter.reset()

    with TestClient(app) as client:
        # Register 5 distinct images -> 201
        for i in range(5):
            img = photo_like(100 + i)
            res = client.post(
                "/api/register",
                files={"file": (f"img_{i}.jpg", to_bytes(img, "JPEG"), "image/jpeg")},
            )
            assert res.status_code == 201, f"Request {i} failed: {res.text}"

        # 6th registration -> 429
        img6 = photo_like(106)
        res6 = client.post(
            "/api/register",
            files={"file": ("img_6.jpg", to_bytes(img6, "JPEG"), "image/jpeg")},
        )
        assert res6.status_code == 429
        assert res6.json()["error"] == "rate_limited"
        assert "Retry-After" in res6.headers

    limiter.reset()
