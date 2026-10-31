"""Unauthenticated endpoints: anyone holding a certificate can verify it."""
import io
import json
import time
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.db import get_db
from app.registry.chain import canonical_json, verify_chain, verify_record
from app.api.auth import utcnow
from app.api.register import iso_utc
from app import storage

router = APIRouter()

_status_cache: dict = {"at": 0.0, "db": None, "value": None}
STATUS_TTL_SECONDS = 15
KIT_DIR = Path(__file__).resolve().parent.parent / "registry" / "kit"


async def _get_work(db, work_id: str) -> dict:
    doc = await db.works.find_one({"id": work_id})
    if not doc:
        raise HTTPException(404, "No registered work with this ID.")
    return doc


@router.get("/registry/status")
async def registry_status(db = Depends(get_db)):
    """Recompute the whole hash chain (cached briefly)."""
    if _status_cache["db"] is db and time.monotonic() - _status_cache["at"] < STATUS_TTL_SECONDS:
        return _status_cache["value"]
    valid, broken_id = await verify_chain(db)
    head = await db.works.find_one({}, {"entry_hash": 1}, sort=[("_id", -1)])
    value = {
        "valid": valid,
        "broken_id": broken_id,
        "length": await db.works.count_documents({}),
        "head_hash": head["entry_hash"] if head else None,
        "checked_at": iso_utc(utcnow()),
    }
    _status_cache.update(at=time.monotonic(), db=db, value=value)
    return value


@router.get("/public/works/{work_id}")
async def public_work(work_id: str, db = Depends(get_db)):
    doc = await _get_work(db, work_id)
    check = await verify_record(db, doc)
    return {
        "id": doc["id"],
        "title": doc["title"],
        "owner_name": doc["owner_name"],
        "created_at": iso_utc(doc["created_at"]),
        "entry_hash": doc["entry_hash"],
        "prev_hash": doc["prev_hash"],
        "phash": doc["phash"],
        "width": doc.get("width"),
        "height": doc.get("height"),
        "image_url": storage.image_url(doc.get("image_path")),
        "registry_position": check["position"],
        "record_intact": check["intact"],
        "chain_linked": check["linked"],
        "file_sha256": doc.get("file_sha256"),
        "anchor": {
            "status": doc.get("anchor_status") or ("pending" if doc.get("ots_proof") else "none"),
            "calendar": doc.get("ots_calendar"),
            "submitted_at": iso_utc(doc["anchored_at"]) if doc.get("anchored_at") else None,
            "has_proof": bool(doc.get("ots_proof")),
            "block_height": doc.get("ots_block_height"),
            "block_time": iso_utc(doc["ots_block_time"]) if doc.get("ots_block_time") else None,
            "block_checked": bool(doc.get("ots_block_checked")),
        },
    }


@router.get("/public/works/{work_id}/verify-kit.zip")
async def verify_kit(work_id: str, db = Depends(get_db)):
    """Everything needed to check this registration offline, plus a standard-library verify script."""
    doc = await _get_work(db, work_id)
    check = await verify_record(db, doc)
    nxt = await db.works.find_one({"_id": {"$gt": doc["_id"]}}, {"prev_hash": 1}, sort=[("_id", 1)])
    chain = {
        "entry_hash": doc["entry_hash"],
        "prev_hash": doc["prev_hash"],
        "next_entry_prev_hash": nxt["prev_hash"] if nxt else None,
        "position": check["position"],
        "record_intact": check["intact"],
        "chain_linked": check["linked"],
        "anchor_status": doc.get("anchor_status"),
        "bitcoin_block_height": doc.get("ots_block_height"),
        "exported_at": iso_utc(utcnow()),
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("record.json", canonical_json(doc))
        z.writestr("chain.json", json.dumps(chain, indent=2))
        if doc.get("ots_proof"):
            z.writestr("record.json.ots", bytes(doc["ots_proof"]))
        for name in ("verify.py", "README.txt"):
            z.write(KIT_DIR / name, name)
    return Response(
        buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="provenance-{work_id}-verify-kit.zip"'},
    )


@router.get("/public/works/{work_id}/record.json")
async def public_record(work_id: str, db = Depends(get_db)):
    """The exact bytes whose SHA-256 equals the entry_hash (and the .ots proof)."""
    doc = await _get_work(db, work_id)
    return Response(
        canonical_json(doc).encode("utf-8"),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="record-{work_id}.json"'},
    )


@router.get("/public/works/{work_id}/proof.ots")
async def public_proof(work_id: str, db = Depends(get_db)):
    doc = await _get_work(db, work_id)
    if not doc.get("ots_proof"):
        raise HTTPException(404, "This work hasn't been anchored yet.")
    return Response(
        bytes(doc["ots_proof"]),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="record-{work_id}.json.ots"'},
    )
