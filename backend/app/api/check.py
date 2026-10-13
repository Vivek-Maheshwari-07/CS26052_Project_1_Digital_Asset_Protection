import json
import logging
import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query

from app.config import settings
from app.db import get_db
from app.gate.pipeline import run_gate
from app.fingerprint.combine import fingerprint, combined_verdict, PIPELINE_VERSION
from app.registry.index import index
from app.api.auth import get_current_user, utcnow
from app.api.register import read_limited, read_upload, iso_utc
from app import storage

router = APIRouter()

# A check stores every possible match, plus the closest few for context.
KEEP_CLOSEST = 3

logger = logging.getLogger("uvicorn.error")
_CLAIM_ORDER = {"TIER1": 0, "TIER2": 1, "RELATED_DIFFERENT_CAPTURE": 2, "TIER3": 3}


async def run_gate_safely(image_bytes: bytes, db, check_id: str, progress=None, owner_id: Optional[str] = None) -> Optional[dict]:
    """The gate verdict as a JSON-able dict (evidence paths turned into URLs), or None when it is
    disabled or failed. `{"error": ...}` is returned for failures so the UI can say so."""
    if not settings.GATE_ENABLED:
        return None
    try:
        # JSON round-trip guarantees plain Python types (no numpy scalars) for Mongo and the response
        verdict = json.loads((await run_gate(image_bytes, db, check_id=check_id, progress=progress, owner_id=owner_id)).model_dump_json())
    except Exception as e:
        logger.exception("Gate failed for check %s", check_id)
        return {"error": f"{type(e).__name__}: {e}", "claims": [], "evidence_urls": {}}
    verdict["evidence_urls"] = {k: storage.image_url(v) for k, v in verdict.pop("evidence_paths").items()}
    return verdict


def _best_claim(gate: Optional[dict]) -> Optional[dict]:
    claims = (gate or {}).get("claims") or []
    return min(claims, key=lambda c: _CLAIM_ORDER.get(c["classification"], 9), default=None)


def _check_response(doc: dict, full: bool = True) -> dict:
    results = doc["results"]
    top = results[0] if results else None
    out = {
        "id": doc["id"],
        "created_at": iso_utc(doc["created_at"]),
        "query_image_url": storage.image_url(doc["image_path"]),
        "query_phash": doc["phash"],
        "query_low_detail": doc.get("low_detail"),
        "filename": doc.get("filename"),
        "top_verdict": top["verdict"] if top else "no_match",
        "top_confidence": top["confidence"] if top else 0,
        "top_title": top["title"] if top else None,
        "match_count": sum(r["verdict"] != "no_match" for r in results),
        "gate_claim": _best_claim(doc.get("gate")),
    }
    if full:
        out["results"] = results
        out["gate"] = doc.get("gate")
    return out


async def check_core(db, current_user, image_bytes: bytes, filename: str, progress=None) -> dict:
    """Check a suspected copy against the caller own registered works only (never anyone else)."""
    def emit(stage, **data):
        if progress:
            progress(stage, **data)

    # 1. Read, normalize and fingerprint the suspected image
    t0 = time.monotonic()
    normalized, fmt = read_upload(image_bytes)
    emit("read", width=normalized.size[0], height=normalized.size[1], format=fmt, bytes=len(image_bytes),
         seconds=round(time.monotonic() - t0, 2))
    t0 = time.monotonic()
    fp = await fingerprint(normalized)
    user_id = str(current_user["_id"])
    emit("fingerprint", phash=fp["phash"], low_detail=bool(fp["low_detail"]), clip_dim=len(fp["embedding"]),
         clip_preview=[round(float(v), 3) for v in fp["embedding"][:64]], seconds=round(time.monotonic() - t0, 2))

    # 2. Vectorised search across the user own works
    await index.sync(db)
    hits = index.search(fp["embedding"], fp["phash"], k=10, user_id=user_id)
    emit("search", scope=sum(1 for u in index.user_ids if u == user_id), hits=len(hits))

    works = {}
    if hits:
        cursor = db.works.find({"id": {"$in": [h["work_id"] for h in hits]}}, {"embedding": 0, "ots_proof": 0})
        works = {w["id"]: w async for w in cursor}

    results = []
    for h in hits:
        w = works.get(h["work_id"])
        if not w:
            continue
        v = combined_verdict(h["phash_score"], h["embedding_score"])
        if v["verdict"] == "no_match" and len(results) >= KEEP_CLOSEST:
            continue
        results.append({
            "work_id": w["id"],
            "title": w["title"],
            "owner_name": w["owner_name"],
            "is_own": True,
            "registered_at": iso_utc(w["created_at"]),
            "image_url": storage.image_url(w.get("image_path")),
            "work_phash": w["phash"],
            "entry_hash": w["entry_hash"],
            **v,
        })
    emit("scores", results=[{"work_id": r["work_id"], "title": r["title"], "image_url": r["image_url"],
                             "phash": r["phash_score"], "embedding": r["embedding_score"], "confidence": r["confidence"]} for r in results])

    # 3. Geometric gate: alignment-based verdict with evidence images (never breaks the check)
    check_id = str(uuid.uuid4())
    gate = await run_gate_safely(image_bytes, db, check_id, progress, user_id)

    # 4. Keep the suspect image and the result as match history
    doc = {
        "id": check_id,
        "user_id": user_id,
        "created_at": utcnow(),
        "filename": (filename or "")[:120],
        "image_path": storage.save_image(image_bytes, fmt, name=check_id, folder="checks"),
        "phash": fp["phash"],
        "low_detail": fp["low_detail"],
        "pipeline_version": PIPELINE_VERSION,
        "results": results,
        "gate": gate,
    }
    await db.checks.insert_one(doc)
    return _check_response(doc)


@router.post("/works/check")
async def check_work(image: UploadFile = File(...), db = Depends(get_db), current_user = Depends(get_current_user)):
    image_bytes = await read_limited(image)
    return await check_core(db, current_user, image_bytes, image.filename)


@router.get("/checks")
async def list_checks(limit: int = Query(50, le=200), db = Depends(get_db), current_user = Depends(get_current_user)):
    cursor = db.checks.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).limit(limit)
    return [_check_response(d, full=False) async for d in cursor]


@router.get("/checks/{check_id}")
async def get_check(check_id: str, db = Depends(get_db), current_user = Depends(get_current_user)):
    doc = await db.checks.find_one({"id": check_id, "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(404, "Check not found")
    return _check_response(doc)
