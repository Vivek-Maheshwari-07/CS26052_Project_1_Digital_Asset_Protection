from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import io
import logging
from PIL import Image

from app.config import settings
from app.db import get_db
from app.registry.chain import append_to_chain
from app.registry.index import index
from app.registry.anchor import anchor_work
from app.fingerprint.combine import fingerprint, PIPELINE_VERSION
from app.api.auth import get_current_user
from app.gate.features import compute_for_registration
from app.gate.pipeline import run_gate
from app import storage, ingestion

logger = logging.getLogger("uvicorn.error")
router = APIRouter()

MAX_UPLOAD_BYTES = 20 * 1024 * 1024


class RegisterResponse(BaseModel):
    id: str
    owner_name: str
    title: str
    created_at: str
    entry_hash: str
    prev_hash: str
    phash: str
    width: Optional[int] = None
    height: Optional[int] = None
    image_url: Optional[str] = None
    anchor_status: Optional[str] = None
    low_detail: Optional[bool] = None
    gate_notices: List[str] = []


def iso_utc(dt) -> str:
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return str(dt)


def to_response(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "owner_name": doc["owner_name"],
        "title": doc["title"],
        "created_at": iso_utc(doc["created_at"]),
        "entry_hash": doc["entry_hash"],
        "prev_hash": doc["prev_hash"],
        "phash": doc["phash"],
        "width": doc.get("width"),
        "height": doc.get("height"),
        "image_url": storage.image_url(doc.get("image_path")),
        "anchor_status": doc.get("anchor_status"),
        "low_detail": doc.get("low_detail"),
    }


async def read_limited(upload: UploadFile) -> bytes:
    """Read an upload, refusing anything over the limit without buffering the rest of it."""
    data = await upload.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Images must be 20 MB or smaller.")
    return data


def read_upload(image_bytes: bytes) -> tuple:
    """Validate size, decode via the ingestion pipeline (bomb guard, EXIF
    orientation, RGB). Returns (normalized_image, original_format); the
    normalized image's own size is used downstream, not the raw bytes',
    so a sideways EXIF-rotated photo reports the dimensions it's shown at."""
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Images must be 20 MB or smaller.")
    try:
        normalized = ingestion.normalize(image_bytes)
    except ingestion.InvalidImageError as e:
        raise HTTPException(400, str(e))
    try:
        with Image.open(io.BytesIO(image_bytes)) as probe:
            original_format = probe.format
    except Exception:
        original_format = None  # non-critical: storage.save_image falls back to .jpg
    return normalized, original_format


def duplicate_error(work: dict, is_own: bool, confidence: float) -> HTTPException:
    """409 for a registration that matches an existing work. Reveals nothing of another creator's work."""
    return HTTPException(409, {
        "message": ("You've already registered a near-identical image." if is_own else
                    "This image matches a work another creator has already registered."),
        "is_own": is_own,
        "can_override": is_own,
        "match": {
            "id": work["id"],
            "title": work["title"] if is_own else None,
            "owner_name": work["owner_name"],
            "created_at": iso_utc(work["created_at"]),
            "image_url": storage.image_url(work.get("image_path")) if is_own else None,
            "confidence": round(confidence, 4),
        },
    })


async def gate_registration_check(db, image_bytes: bytes, user_id: str, allow_similar_own: bool) -> List[str]:
    """Run the gate on a new upload. Returns notices for the response; raises 409 on a Tier 1 hit.

    A gate failure never blocks a registration: the fingerprint duplicate check above still applies.
    """
    if not settings.GATE_ENABLED:
        return []
    try:
        verdict = await run_gate(image_bytes, db, with_evidence=False)
    except Exception:
        logger.exception("Gate check failed during registration; continuing without it.")
        return []

    notices: List[str] = []
    for claim in verdict.claims:
        work = await db.works.find_one({"id": claim.candidate_work_id}, {"embedding": 0, "ots_proof": 0})
        if not work:
            continue
        is_own = work.get("user_id") == user_id
        if claim.classification == "TIER1" and not (is_own and allow_similar_own):
            raise duplicate_error(work, is_own, 1.0)
        if is_own:
            notices.append(f"Looks related to your registered work \"{work['title']}\".")
        else:
            notices.append("This image looks related to a work another creator has registered. "
                           "It was still registered, and both records are kept.")
    return notices


async def find_duplicate(db, fp: dict) -> Optional[dict]:
    await index.sync(db)
    for hit in index.search(fp["embedding"], fp["phash"], k=3):
        if hit["embedding_score"] >= settings.DUPLICATE_EMBEDDING or hit["phash_score"] >= settings.DUPLICATE_PHASH:
            return hit
    return None


@router.post("/register", response_model=RegisterResponse)
async def register_work(
    background: BackgroundTasks,
    image: UploadFile = File(...),
    owner_name: str = Form(...),
    title: str = Form(...),
    allow_similar_own: bool = Form(False),
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    owner_name, title = owner_name.strip(), title.strip()
    if not owner_name or not title:
        raise HTTPException(400, "Title and owner name are required.")
    if len(title) > 120 or len(owner_name) > 80:
        raise HTTPException(400, "Title or owner name is too long.")

    # 1. Read, bomb-guard, EXIF-orient and RGB-normalize the upload
    image_bytes = await read_limited(image)
    normalized, fmt = read_upload(image_bytes)
    width, height = normalized.size

    # 2. Fingerprint the normalized image
    fp = await fingerprint(normalized)
    user_id = str(current_user["_id"])

    # 3. Refuse near-duplicates of works already in the registry
    dup = await find_duplicate(db, fp)
    if dup:
        work = await db.works.find_one({"id": dup["work_id"]}, {"embedding": 0, "ots_proof": 0})
        is_own = dup["user_id"] == user_id
        if not (is_own and allow_similar_own):
            raise duplicate_error(work, is_own, dup["confidence"])

    # 3b. Geometric gate: pixel evidence that this is a copy of a registered work blocks it
    # (never against another creator's work); weaker leads only produce a notice.
    notices = await gate_registration_check(db, image_bytes, user_id, allow_similar_own)

    # 4. Save the original upload bytes, then append to the registry
    image_path = storage.save_image(image_bytes, fmt)
    record = await append_to_chain(db, {
        "owner_name": owner_name,
        "title": title,
        "phash": fp["phash"],
        "embedding": fp["embedding"],
        "low_detail": fp["low_detail"],
        "pipeline_version": PIPELINE_VERSION,
        "user_id": user_id,
        "width": width,
        "height": height,
        "image_path": image_path,
    })
    index.add(db, record.id, user_id, fp["embedding"], fp["phash"])

    # 5. Timestamp the entry hash in Bitcoin via OpenTimestamps (after responding)
    background.add_task(anchor_work, db, record.id, record.entry_hash)
    # ...and compute the gate's per-work features (DINOv2 vector + SIFT cache) so the new work is searchable
    if settings.GATE_ENABLED:
        background.add_task(compute_for_registration, db, record.id, image_bytes)

    return {**to_response(record.model_dump()), "gate_notices": notices}


@router.get("", response_model=List[RegisterResponse])
async def list_works(db = Depends(get_db), current_user = Depends(get_current_user)):
    cursor = db.works.find({"user_id": str(current_user["_id"])}, {"embedding": 0, "ots_proof": 0}).sort("_id", -1)
    return [to_response(doc) async for doc in cursor]
