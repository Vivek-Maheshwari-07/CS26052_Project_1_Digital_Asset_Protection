"""Anchor registry hashes in Bitcoin through OpenTimestamps calendars.

A work's entry_hash is SHA-256(canonical_json(record)), so we submit that
digest directly. The resulting .ots proof verifies the record.json download
with the standard client (pip install opentimestamps-client):

    ots upgrade proof.ots          # after a few hours, once the calendar commits to Bitcoin
    ots verify proof.ots -f record.json
"""
import logging

import httpx
from bson import Binary

from app.config import settings
from app.api.auth import utcnow

logger = logging.getLogger("uvicorn.error")

OTS_MAGIC = b"\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94"
OTS_MAJOR_VERSION = b"\x01"
OP_SHA256 = b"\x08"


def build_ots_file(digest: bytes, calendar_timestamp: bytes) -> bytes:
    """Detached timestamp file: header, file-hash op + digest, then the calendar's timestamp."""
    return OTS_MAGIC + OTS_MAJOR_VERSION + OP_SHA256 + digest + calendar_timestamp


async def submit_digest(digest: bytes) -> tuple[str, bytes] | None:
    headers = {"Accept": "application/vnd.opentimestamps.v1", "User-Agent": "provenance-registry"}
    calendars = [c.strip() for c in settings.OTS_CALENDARS.split(",") if c.strip()]
    async with httpx.AsyncClient(timeout=15) as client:
        for calendar in calendars:
            try:
                r = await client.post(f"{calendar}/digest", content=digest, headers=headers)
                if r.status_code == 200 and r.content:
                    return calendar, r.content
            except httpx.HTTPError as e:
                logger.warning("OpenTimestamps calendar %s failed: %s", calendar, e)
    return None


async def anchor_work(db, work_id: str, entry_hash: str) -> bool:
    if not settings.OTS_ENABLED:
        return False
    result = await submit_digest(bytes.fromhex(entry_hash))
    if not result:
        await db.works.update_one({"id": work_id}, {"$set": {"anchor_status": "failed"}})
        return False
    calendar, ts = result
    await db.works.update_one({"id": work_id}, {"$set": {
        "anchor_status": "pending",
        "ots_calendar": calendar,
        "ots_proof": Binary(build_ots_file(bytes.fromhex(entry_hash), ts)),
        "anchored_at": utcnow(),
    }})
    return True


async def anchor_missing(db) -> None:
    """Retry works that never got a proof (e.g. the calendar was unreachable)."""
    if not settings.OTS_ENABLED:
        return
    async for doc in db.works.find({"ots_proof": {"$exists": False}}, {"id": 1, "entry_hash": 1}):
        await anchor_work(db, doc["id"], doc["entry_hash"])
