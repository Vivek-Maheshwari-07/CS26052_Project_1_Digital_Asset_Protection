import asyncio
import pathlib
import subprocess
import sys
import time

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings, get_config
from app.core.sql import Q3_STAGE2
from app.errors import Busy
from tests.factories import image_row

DATA_DIR = pathlib.Path(__file__).parent / "data"


# =========================================================================
# Tests WITHOUT Models (Always run)
# =========================================================================

def test_pad_to_square():
    from app.core.embedder import GREY, pad_to_square

    # 1000x200 image: red with distinctive pixel at (500, 0)
    img_rect = Image.new("RGB", (1000, 200), (255, 0, 0))
    img_rect.putpixel((500, 0), (0, 255, 0))

    padded = pad_to_square(img_rect)
    assert padded.size == (1000, 1000)
    assert padded.getpixel((0, 0)) == GREY
    assert padded.getpixel((500, 400)) == (0, 255, 0)

    # 300x300 already square image
    img_sq = Image.new("RGB", (300, 300), (10, 20, 30))
    padded_sq = pad_to_square(img_sq)
    assert padded_sq.size == (300, 300)


@pytest.mark.asyncio
async def test_embed_gated_queue_full():
    from app.core.embedder import embed_gated

    gate = asyncio.Semaphore(1)
    await gate.acquire()

    class FakeEmbedder:
        def embed(self, img):
            return np.zeros(512), np.zeros(768)

    img = Image.new("RGB", (64, 64), (128, 128, 128))
    with pytest.raises(Busy, match="Inference queue full"):
        await embed_gated(FakeEmbedder(), img, gate, wait_s=0.1)

    # Prove gate semaphore value was not released
    assert gate._value == 0
    gate.release()


def test_resolve_device():
    from app.core.embedder import resolve_device

    assert resolve_device("cpu") == "cpu"
    auto_dev = resolve_device("auto")
    assert auto_dev in ("cpu", "cuda")


def test_skip_models_does_not_import_transformers():
    code = """
import sys
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app

settings = Settings(provnet_skip_models=True)
app = create_app(settings)
with TestClient(app) as client:
    res = client.get('/api/health')
    assert res.status_code == 200

assert 'transformers' not in sys.modules, f"transformers was imported: {sys.modules.get('transformers')}"
print('SUCCESS_NO_TRANSFORMERS')
"""
    backend_dir = pathlib.Path(__file__).resolve().parent.parent
    proc = subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(backend_dir),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Subprocess failed:\nstdout: {proc.stdout}\nstderr: {proc.stderr}"
    assert "SUCCESS_NO_TRANSFORMERS" in proc.stdout


# =========================================================================
# Tests WITH Models (@pytest.mark.models)
# =========================================================================

@pytest.mark.models
def test_embed_shapes_dtypes_and_norms(embedder):
    img = Image.open(DATA_DIR / "a.jpg")
    clip_emb, dino_emb = embedder.embed(img)

    assert clip_emb.shape == (512,)
    assert clip_emb.dtype == np.float32
    clip_norm = float(np.linalg.norm(clip_emb))
    assert np.isclose(clip_norm, 1.0, atol=1e-5)

    assert dino_emb.shape == (768,)
    assert dino_emb.dtype == np.float32
    dino_norm = float(np.linalg.norm(dino_emb))
    assert np.isclose(dino_norm, 1.0, atol=1e-5)


@pytest.mark.models
def test_embed_determinism(embedder):
    img = Image.open(DATA_DIR / "a.jpg")
    clip1, dino1 = embedder.embed(img)
    clip2, dino2 = embedder.embed(img)

    clip_cos = float(np.dot(clip1, clip2))
    dino_cos = float(np.dot(dino1, dino2))

    assert clip_cos > 0.9999
    assert dino_cos > 0.9999


@pytest.mark.models
def test_processor_input_shapes(embedder):
    img = Image.new("RGB", (1000, 200), (128, 128, 128))
    from app.core.embedder import pad_to_square

    prepped = [pad_to_square(img)]
    clip_inputs = embedder.clip_proc(images=prepped, return_tensors="pt", **embedder.proc_kw)
    dino_inputs = embedder.dino_proc(images=prepped, return_tensors="pt", **embedder.proc_kw)

    assert clip_inputs["pixel_values"].shape == (1, 3, 224, 224)
    assert dino_inputs["pixel_values"].shape == (1, 3, 224, 224)


@pytest.mark.models
def test_embed_batch_parity(embedder):
    images = [Image.open(DATA_DIR / f"{name}.jpg") for name in ["a", "b", "c"]]
    batch_clip, batch_dino = embedder.embed_batch(images)

    for idx, img in enumerate(images):
        single_clip, single_dino = embedder.embed(img)
        assert np.allclose(batch_clip[idx], single_clip, atol=1e-5)
        assert np.allclose(batch_dino[idx], single_dino, atol=1e-5)


@pytest.mark.models
def test_robustness_and_separation(embedder):
    import io

    photos = {name: Image.open(DATA_DIR / f"{name}.jpg") for name in ["a", "b", "c", "d", "e", "f"]}
    embeddings = {name: embedder.embed(img) for name, img in photos.items()}

    # 1. Robustness: JPEG q50 re-encode -> DINOv2 cosine >= 0.90
    min_robustness_cos = 1.0
    for name, orig_img in photos.items():
        buf = io.BytesIO()
        orig_img.save(buf, format="JPEG", quality=50)
        reencoded = Image.open(io.BytesIO(buf.getvalue()))
        _, re_dino = embedder.embed(reencoded)
        cos = float(np.dot(embeddings[name][1], re_dino))
        min_robustness_cos = min(min_robustness_cos, cos)
        assert cos >= 0.90, f"Photo {name} failed robustness with cos={cos}"

    print(f"\n[WP4 Metric] Min JPEG-q50 DINOv2 cosine: {min_robustness_cos:.4f}")

    # 2. Separation: all 15 cross-photo pairs -> DINOv2 cosine < 0.90
    names = list(photos.keys())
    max_cross_cos = -1.0
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            n1, n2 = names[i], names[j]
            cos = float(np.dot(embeddings[n1][1], embeddings[n2][1]))
            max_cross_cos = max(max_cross_cos, cos)
            assert cos < 0.90, f"Pair ({n1}, {n2}) failed separation with cos={cos}"

    print(f"[WP4 Metric] Max cross-pair DINOv2 cosine: {max_cross_cos:.4f}")


@pytest.mark.models
@pytest.mark.asyncio
async def test_db_roundtrip_vectors(embedder, async_engine, clean_db):
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker

    from app.core.hasher import compute_hashes
    from app.models import Image as ImageModel

    cfg = get_config()
    img = Image.open(DATA_DIR / "a.jpg")
    clip_vec, dino_vec = embedder.embed(img)
    hashes = compute_hashes(img, cfg)

    row_data = image_row(
        phash=hashes.phash,
        dhash=hashes.dhash,
        ahash=hashes.ahash,
        whash=hashes.whash,
        low_detail=hashes.low_detail,
        clip_emb=clip_vec.tolist(),
        dino_emb=dino_vec.tolist(),
    )

    async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        db_img = ImageModel(**row_data)
        session.add(db_img)
        await session.commit()

        # Query via Q3_STAGE2
        res = await session.execute(
            Q3_STAGE2,
            {
                "phash": int(hashes.phash, 16).to_bytes(8, "big"),
                "dhash": int(hashes.dhash, 16).to_bytes(8, "big"),
                "ahash": int(hashes.ahash, 16).to_bytes(8, "big"),
                "whash": int(hashes.whash, 16).to_bytes(8, "big"),
                "dino": dino_vec.tolist(),
                "clip": clip_vec.tolist(),
                "k": 10,
            },
        )
        row = res.mappings().one()
        cos_clip = float(row["cos_clip"])
        cos_dino = float(row["cos_dino"])

        assert np.isclose(cos_clip, 1.0, atol=1e-5)
        assert np.isclose(cos_dino, 1.0, atol=1e-5)
        assert np.isclose(cos_clip, float(np.dot(clip_vec, clip_vec)), atol=1e-5)
        assert np.isclose(cos_dino, float(np.dot(dino_vec, dino_vec)), atol=1e-5)


@pytest.mark.models
def test_health_with_models(async_db_url, migrated_db, clean_db, tmp_path):
    from app.main import create_app

    settings = Settings(
        database_url=async_db_url,
        provnet_skip_models=False,
        storage_dir=str(tmp_path),
    )
    app = create_app(settings)
    with TestClient(app) as client:
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["models_loaded"] == {"clip": True, "dino": True}
        assert data["device"] in ("cpu", "cuda")


@pytest.mark.models
@pytest.mark.slow
def test_embed_speed(embedder):
    img = Image.open(DATA_DIR / "a.jpg")
    latencies_ms = []
    for _ in range(10):
        t0 = time.perf_counter()
        embedder.embed(img)
        t1 = time.perf_counter()
        latencies_ms.append((t1 - t0) * 1000.0)

    median_latency = float(np.median(latencies_ms))
    print(f"\n[WP4 Metric] Measured median embed latency: {median_latency:.2f} ms")
    assert median_latency < 800.0, f"Median latency {median_latency:.2f}ms exceeds 800ms limit"


@pytest.mark.models
def test_offline_embedder_construction():
    code = """
import os
import pathlib
import sys
backend_dir = pathlib.Path('.').resolve()
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import get_config, get_settings
from app.core.embedder import Embedder

settings = get_settings()
cfg = get_config()

hf_path = pathlib.Path(settings.hf_home)
if not hf_path.is_absolute():
    hf_path = backend_dir / hf_path
os.environ['HF_HOME'] = str(hf_path)
os.environ['HF_HUB_OFFLINE'] = '1'

emb = Embedder(cfg.models, device='cpu')
emb.warm_up()
print('OFFLINE_SUCCESS')
"""
    backend_dir = pathlib.Path(__file__).resolve().parent.parent
    proc = subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(backend_dir),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Offline Embedder test failed:\nstdout: {proc.stdout}\nstderr: {proc.stderr}"
    assert "OFFLINE_SUCCESS" in proc.stdout
