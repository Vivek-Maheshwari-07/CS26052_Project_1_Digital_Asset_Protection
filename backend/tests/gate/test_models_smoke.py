"""Smoke test with the real CLIP + DINOv2 weights on the repo's own phone images.

Deselected by default (needs the weights cached or a network):  pytest -m models
"""
from pathlib import Path

import pytest
import pytest_asyncio

from app import storage
from app.gate.normalize import normalize_image
from app.gate.pipeline import run_gate
from app.gate.verify import FEATURE_VERSION, get_cached_features

pytestmark = [pytest.mark.models, pytest.mark.asyncio]

PHONE = Path(__file__).resolve().parents[2] / "eval" / "spike" / "phone"
ORIG, SIBLING, UNRELATED = PHONE / "ORIG.jpeg", PHONE / "SIBLING.jpeg", PHONE / "38906.jpg"


@pytest_asyncio.fixture
async def db():
    if not ORIG.exists():
        pytest.skip("eval/spike/phone images not present")
    from app.gate.retrieve import embed_clip, embed_dino
    from app.gate.run import _Db

    raw = ORIG.read_bytes()
    storage.save_image(raw, "JPEG", name="orig")
    img, _, _ = normalize_image(raw)
    get_cached_features("orig", FEATURE_VERSION, img)
    return _Db("orig", *img.size, embed_clip(img).tolist(), embed_dino(img).tolist(), "orig.jpg")


async def test_self_is_tier1(db):
    v = await run_gate(ORIG.read_bytes(), db)
    assert [c.classification for c in v.claims] == ["TIER1"] and not v.warnings


async def test_half_crop_is_tier1(db, tmp_path):
    from PIL import Image
    im = Image.open(ORIG).convert("RGB")
    w, h = im.size
    out = tmp_path / "crop.jpg"
    im.crop((w // 4, h // 4, 3 * w // 4, 3 * h // 4)).save(out, quality=92)
    v = await run_gate(out.read_bytes(), db)
    assert [c.classification for c in v.claims] == ["TIER1"]


async def test_different_capture_is_a_lead_not_proof(db):
    v = await run_gate(SIBLING.read_bytes(), db)
    assert [(c.classification, c.grade) for c in v.claims] == [("RELATED_DIFFERENT_CAPTURE", "lead")]
    assert all(c.human_review_required for c in v.claims)


async def test_unrelated_photo_gets_no_claim(db):
    assert (await run_gate(UNRELATED.read_bytes(), db)).claims == []
