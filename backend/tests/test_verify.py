import uuid

from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_config
from app.core.hasher import compute_hashes
from app.db import make_sync_engine
from app.models import Verification
from app.schemas import DeepVerifyResponse, VerifyResponse
from tests.images import flat, photo_like, to_bytes


def _sync_url(db_url: str) -> str:
    if db_url.startswith("postgresql://"):
        return db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return db_url


def _register(client, img_bytes: bytes, name: str = "img.png", owner: str | None = None) -> dict:
    data = {"owner_name": owner} if owner else {}
    res = client.post("/api/register", files={"file": (name, img_bytes, "image/png")}, data=data)
    assert res.status_code == 201, res.text
    return res.json()


def _verify(client, img_bytes: bytes, name: str = "query.png"):
    return client.post("/api/verify", files={"file": (name, img_bytes, "image/png")})


def _low_detail_image() -> Image.Image:
    img = Image.blend(flat(128, size=(640, 480)), photo_like(5, size=(640, 480)), 0.08)
    assert compute_hashes(img, get_config()).low_detail
    return img


def _stage_names(body: dict) -> list[str]:
    return [s["stage"] for s in body["stages"]]


def test_verify_empty_registry_skips_models(api_client, db_url):
    res = _verify(api_client, to_bytes(photo_like(1), "PNG"))
    assert res.status_code == 200, res.text
    body = VerifyResponse.model_validate(res.json())

    assert body.decided_by == "none"
    assert body.verdict == "no_match"
    assert body.candidates == []
    assert _stage_names(res.json()) == ["sha256", "hash"]
    assert res.json()["stages"][1]["best_phash_hamming"] is None
    assert api_client.fake_embedder.calls == 0

    with Session(make_sync_engine(_sync_url(db_url))) as s:
        row = s.scalar(select(Verification).where(Verification.id == body.verification_id))
        assert row is not None
        assert row.decided_by == "none"
        assert row.top_match is None


def test_verify_exact_sha256_exit(api_client):
    img_bytes = to_bytes(photo_like(10), "PNG")
    reg = _register(api_client, img_bytes, owner="Asha")
    calls_after_register = api_client.fake_embedder.calls

    res = _verify(api_client, img_bytes)
    assert res.status_code == 200, res.text
    body = res.json()
    VerifyResponse.model_validate(body)

    assert body["decided_by"] == "sha256"
    assert body["verdict"] == "match"
    assert _stage_names(body) == ["sha256"]
    assert body["stages"][0]["hit"] is True
    cand = body["candidates"][0]
    assert cand["image_id"] == reg["image_id"]
    assert cand["owner_name"] == "Asha"
    assert cand["hamming"] == {"phash": 0, "dhash": 0, "ahash": 0, "whash": 0}
    assert cand["cosine"] == {"dino": None, "clip": None}
    assert cand["thumbnail_url"] == f"/api/images/{reg['image_id']}/file?size=thumb"
    assert api_client.fake_embedder.calls == calls_after_register


def test_verify_hash_exit_reencode(api_client, db_url):
    img = photo_like(20)
    reg = _register(api_client, to_bytes(img, "PNG"))
    calls_after_register = api_client.fake_embedder.calls

    res = _verify(api_client, to_bytes(img, "JPEG", quality=90), name="q.jpg")
    assert res.status_code == 200, res.text
    body = res.json()
    VerifyResponse.model_validate(body)

    assert body["decided_by"] == "hash"
    assert body["verdict"] == "match"
    assert _stage_names(body) == ["sha256", "hash"]
    assert body["stages"][1]["confident"] is True
    assert body["stages"][1]["best_phash_hamming"] <= 8
    top = body["candidates"][0]
    assert top["image_id"] == reg["image_id"]
    assert top["cosine"] == {"dino": None, "clip": None}
    assert top["above_threshold"] == {"hash": True, "dino": None}
    assert body["thresholds"]["evidence"]["clip"] == get_config().evidence_thresholds.clip
    # The defining property of the cascade: no model inference on a confident hash match.
    assert api_client.fake_embedder.calls == calls_after_register

    with Session(make_sync_engine(_sync_url(db_url))) as s:
        row = s.scalar(select(Verification).where(Verification.id == uuid.UUID(body["verification_id"])))
        assert row.decided_by == "hash"
        assert str(row.top_match) == reg["image_id"]
        assert row.candidates[0]["cosine"] == {"dino": None, "clip": None}


def test_verify_hash_exit_works_without_models(api_client):
    img = photo_like(21)
    _register(api_client, to_bytes(img, "PNG"))
    api_client.models_available = False

    res = _verify(api_client, to_bytes(img, "JPEG", quality=90), name="q.jpg")
    assert res.status_code == 200, res.text
    assert res.json()["decided_by"] == "hash"


def test_verify_low_detail_escalates_to_embedding(api_client, db_url):
    base = _low_detail_image()
    reg = _register(api_client, to_bytes(base, "PNG"))
    calls_after_register = api_client.fake_embedder.calls

    res = _verify(api_client, to_bytes(base, "JPEG", quality=90), name="q.jpg")
    assert res.status_code == 200, res.text
    body = res.json()
    VerifyResponse.model_validate(body)

    assert body["query"]["low_detail"] is True
    assert _stage_names(body) == ["sha256", "hash", "embedding"]
    assert body["stages"][1]["confident"] is False  # pHash is never trusted on low-detail images
    assert api_client.fake_embedder.calls == calls_after_register + 1
    assert body["decided_by"] == "embedding"
    assert body["verdict"] == "match"
    top = body["candidates"][0]
    assert top["image_id"] == reg["image_id"]
    assert top["cosine"]["dino"] >= 0.90
    assert top["cosine"]["clip"] is not None
    assert top["above_threshold"] == {"hash": False, "dino": True}
    assert body["stages"][2]["best_dino_cosine"] == top["cosine"]["dino"]

    with Session(make_sync_engine(_sync_url(db_url))) as s:
        row = s.scalar(select(Verification).where(Verification.id == uuid.UUID(body["verification_id"])))
        assert row.decided_by == "embedding"
        assert str(row.top_match) == reg["image_id"]


def test_verify_unrelated_runs_stage2_consistently(api_client):
    _register(api_client, to_bytes(photo_like(1), "PNG"))
    _register(api_client, to_bytes(photo_like(2), "PNG"))

    res = _verify(api_client, to_bytes(photo_like(3), "PNG"))
    assert res.status_code == 200, res.text
    body = res.json()
    VerifyResponse.model_validate(body)

    assert _stage_names(body) == ["sha256", "hash", "embedding"]
    emb = body["stages"][2]
    dinos = [c["cosine"]["dino"] for c in body["candidates"]]
    assert dinos == sorted(dinos, reverse=True)  # Stage 2 ranks by DINOv2 cosine
    assert emb["best_dino_cosine"] == dinos[0]
    threshold = body["thresholds"]["dino_cosine_match_min"]
    assert emb["passed"] == (dinos[0] >= threshold)
    assert body["decided_by"] == ("embedding" if emb["passed"] else "none")
    assert [c["rank"] for c in body["candidates"]] == list(range(1, len(dinos) + 1))
    for c in body["candidates"]:
        assert c["above_threshold"]["dino"] == (c["cosine"]["dino"] >= threshold)


def test_verify_stage2_without_models_is_503(api_client):
    _register(api_client, to_bytes(photo_like(1), "PNG"))
    api_client.models_available = False

    res = _verify(api_client, to_bytes(photo_like(3), "PNG"))
    assert res.status_code == 503
    assert res.json()["error"] == "busy"


def test_verify_rejects_non_image(api_client):
    res = api_client.post("/api/verify", files={"file": ("x.png", b"not an image", "image/png")})
    assert res.status_code == 400
    assert res.json()["error"] == "invalid_image"


# ------------------------------- /api/verify/deep -------------------------------


def test_deep_fills_cosines_after_hash_exit(api_client, db_url):
    img = photo_like(30)
    reg = _register(api_client, to_bytes(img, "PNG"))
    query = to_bytes(img, "JPEG", quality=90)
    first = _verify(api_client, query, name="q.jpg").json()
    assert first["decided_by"] == "hash"
    calls_before = api_client.fake_embedder.calls

    res = api_client.post(
        "/api/verify/deep",
        files={"file": ("q.jpg", query, "image/jpeg")},
        data={"verification_id": first["verification_id"]},
    )
    assert res.status_code == 200, res.text
    body = DeepVerifyResponse.model_validate(res.json())

    assert api_client.fake_embedder.calls == calls_before + 1
    assert body.decided_by == "hash"  # deep evidence never rewrites the cascade's decision
    assert [c.rank for c in body.candidates] == [c["rank"] for c in first["candidates"]]
    top = body.candidates[0]
    assert str(top.image_id) == reg["image_id"]
    assert top.cosine.dino is not None and top.cosine.clip is not None
    assert top.above_threshold.dino == (top.cosine.dino >= first["thresholds"]["dino_cosine_match_min"])

    with Session(make_sync_engine(_sync_url(db_url))) as s:
        row = s.scalar(select(Verification).where(Verification.id == body.verification_id))
        assert row.decided_by == "hash"
        assert row.candidates[0]["cosine"] == {"dino": None, "clip": None}


def test_deep_rejects_different_query_file(api_client):
    img = photo_like(31)
    _register(api_client, to_bytes(img, "PNG"))
    first = _verify(api_client, to_bytes(img, "JPEG", quality=90), name="q.jpg").json()

    res = api_client.post(
        "/api/verify/deep",
        files={"file": ("other.png", to_bytes(photo_like(32), "PNG"), "image/png")},
        data={"verification_id": first["verification_id"]},
    )
    assert res.status_code == 409
    assert res.json()["error"] == "query_mismatch"


def test_deep_unknown_verification_404(api_client):
    res = api_client.post(
        "/api/verify/deep",
        files={"file": ("q.png", to_bytes(photo_like(1), "PNG"), "image/png")},
        data={"verification_id": str(uuid.uuid4())},
    )
    assert res.status_code == 404
    assert res.json()["error"] == "not_found"


def test_deep_with_no_candidates_skips_models(api_client):
    query = to_bytes(photo_like(33), "PNG")
    first = _verify(api_client, query).json()
    assert first["candidates"] == []

    res = api_client.post(
        "/api/verify/deep",
        files={"file": ("q.png", query, "image/png")},
        data={"verification_id": first["verification_id"]},
    )
    assert res.status_code == 200, res.text
    assert res.json()["candidates"] == []
    assert res.json()["embedding_latency_ms"] is None
    assert api_client.fake_embedder.calls == 0
