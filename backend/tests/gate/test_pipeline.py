"""run_gate end to end on synthetic images with the retrieval stage stubbed (no model weights)."""
import os

import pytest
import pytest_asyncio
from mongomock_motor import AsyncMongoMockClient
from PIL import ImageOps

from app import storage
from app.config import settings as app_settings
from app.gate.features import load_target
from app.gate.normalize import normalize_image
from app.gate.pipeline import run_gate
from app.gate.retrieve import Candidate, DualIndex
from app.gate.verify import FEATURE_VERSION, get_cached_features
from app.gate.verdict import Verdict

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def registry(orig_img, as_bytes, monkeypatch):
    """A mock registry holding one work: stored image + SIFT cache, with retrieval returning it."""
    db = AsyncMongoMockClient().gate_test
    raw = as_bytes(orig_img, "PNG")
    path = storage.save_image(raw, "PNG", name="w1")
    await db.works.insert_one({"id": "w1", "width": orig_img.width, "height": orig_img.height, "image_path": path})
    get_cached_features("w1", FEATURE_VERSION, normalize_image(raw)[0])

    async def fake_retrieve(image, _db):
        return [Candidate("w1", 0.9, 0.9, 1, 1, lead_score=0.9, lead_margin=0.2)], 0.9

    monkeypatch.setattr("app.gate.pipeline.retrieve", fake_retrieve)
    return db


async def test_exact_copy_gets_tier1_evidence_claim_and_evidence_files(registry, orig_img, as_bytes):
    v = await run_gate(as_bytes(orig_img), registry)
    assert isinstance(v, Verdict)
    assert [(c.classification, c.grade, c.human_review_required) for c in v.claims] == [("TIER1", "evidence", False)]
    assert set(v.evidence_paths) == {"overlay", "heatmap", "changes", "matches"}
    for rel in v.evidence_paths.values():
        assert os.path.isfile(os.path.join(storage.upload_dir(), rel))
    assert not v.warnings


async def test_cropped_and_flipped_copy_is_tier1(registry, orig_img, as_bytes):
    w, h = orig_img.size
    suspect = ImageOps.mirror(orig_img.crop((w // 5, h // 5, 4 * w // 5, 4 * h // 5)))
    v = await run_gate(as_bytes(suspect), registry)
    assert [c.classification for c in v.claims] == ["TIER1"]
    assert v.candidates[0].metrics["flipped"] is True


async def test_unrelated_image_gets_no_claim(registry, other_img, as_bytes):
    v = await run_gate(as_bytes(other_img), registry)
    assert v.claims == [] and v.evidence_paths == {}


async def test_related_capture_is_a_lead_needing_review(registry, orig_img, make_image, as_bytes):
    edited = orig_img.copy()
    w, h = orig_img.size
    edited.paste(make_image(99, (int(w * 0.8), int(h * 0.5))), (int(w * 0.1), int(h * 0.25)))
    v = await run_gate(as_bytes(edited), registry)
    assert [(c.classification, c.grade, c.human_review_required) for c in v.claims] == \
           [("RELATED_DIFFERENT_CAPTURE", "lead", True)]
    assert "w1" in v.shadow  # the Tier 2 reading is logged, not claimed


async def test_missing_features_are_reported_not_silent(registry, orig_img, as_bytes, tmp_path, monkeypatch):
    monkeypatch.setattr(app_settings, "UPLOAD_DIR", str(tmp_path / "empty"))  # no SIFT cache here
    v = await run_gate(as_bytes(orig_img), registry)
    assert v.claims == []
    assert v.candidates[0].error_reason == "Target features not cached."
    assert any("w1" in w for w in v.warnings)


async def test_stage_failure_is_recorded_in_warnings(registry, orig_img, as_bytes, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("kaboom")

    monkeypatch.setattr("app.gate.pipeline.verify_geometry", boom)
    v = await run_gate(as_bytes(orig_img), registry)
    assert v.claims == [] and any("kaboom" in w for w in v.warnings)


async def test_verdict_records_config_snapshot(registry, orig_img, as_bytes):
    v = await run_gate(as_bytes(orig_img), registry)
    assert v.config_hash and '"tier1_flow_median_max_px"' in v.config_snapshot
    assert v.pipeline_version


async def test_load_target_matches_suspect_normalisation(registry):
    assert load_target("w1.png") is not None and load_target("nope.png") is None


async def test_dual_index_does_not_rebuild_when_some_works_lack_dino():
    db = AsyncMongoMockClient().idx
    await db.works.insert_many([{"id": "a", "embedding": [1.0, 0.0]}, {"id": "b", "embedding": [0.0, 1.0]}])
    await db.gate_features.insert_one({"work_id": "a", "model": "dinov2-small", "vector": [1.0, 0.0, 0.0]})
    idx = DualIndex()
    await idx.sync(db)
    assert idx.ids == ["a"]  # b has no DINO vector yet

    calls = []
    original_find = db.works.find
    db.works.find = lambda *a, **k: calls.append(1) or original_find(*a, **k)
    await idx.sync(db)
    assert calls == []  # counts unchanged -> no rebuild (it used to rebuild on every query)
