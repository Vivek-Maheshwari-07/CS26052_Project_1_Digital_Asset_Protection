"""Anchor registry hashes in Bitcoin through OpenTimestamps calendars.

A work's entry_hash is SHA-256(canonical_json(record)), so we submit that
digest directly. The resulting .ots proof verifies the record.json download
with the standard client (pip install opentimestamps-client):

    ots upgrade proof.ots          # after a few hours, once the calendar commits to Bitcoin
    ots verify proof.ots -f record.json

`upgrade_pending` does that upgrade for every stored proof, so the app itself can say "confirmed in
Bitcoin block N" instead of "pending" forever. Run it once by hand with:

    python -m app.registry.anchor
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

import httpx
from bson import Binary
from opentimestamps.calendar import RemoteCalendar
from opentimestamps.core.notary import BitcoinBlockHeaderAttestation, PendingAttestation
from opentimestamps.core.serialize import BytesDeserializationContext, BytesSerializationContext
from opentimestamps.core.timestamp import DetachedTimestampFile

from app.config import settings
from app.api.auth import utcnow

logger = logging.getLogger("uvicorn.error")

# A proof only ever sends us to calendars it names, but those names come from stored data: only ask
# the public OpenTimestamps calendars (and any configured one) for upgrades.
TRUSTED_CALENDAR_SUFFIX = ".opentimestamps.org"

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


# ---------- upgrade: pending calendar promise -> Bitcoin block attestation ----------

def _trusted_calendar(uri: str) -> bool:
    host = urlparse(uri).hostname or ""
    configured = {urlparse(c.strip()).hostname for c in settings.OTS_CALENDARS.split(",") if c.strip()}
    return urlparse(uri).scheme == "https" and (host.endswith(TRUSTED_CALENDAR_SUFFIX) or host in configured)


def _walk(stamp):
    yield stamp
    for child in stamp.ops.values():
        yield from _walk(child)


def upgrade_proof(ots_bytes: bytes, get_timestamp=None) -> tuple:
    """(upgraded .ots bytes, changed?) after asking each pending calendar for its finished timestamp.

    `get_timestamp(uri, commitment)` is injectable for tests; by default it calls the calendar.
    A calendar that has not committed to Bitcoin yet raises, and that branch simply stays pending."""
    get_timestamp = get_timestamp or (lambda uri, commitment: RemoteCalendar(uri).get_timestamp(commitment, timeout=15))
    detached = DetachedTimestampFile.deserialize(BytesDeserializationContext(ots_bytes))
    changed = False
    for stamp in list(_walk(detached.timestamp)):
        pending = [a for a in stamp.attestations if isinstance(a, PendingAttestation)]
        for attestation in pending:
            if not _trusted_calendar(attestation.uri):
                logger.warning("Skipping OpenTimestamps upgrade from untrusted calendar %s", attestation.uri)
                continue
            try:
                stamp.merge(get_timestamp(attestation.uri, stamp.msg))
                changed = True
            except Exception as e:  # not committed yet (404), calendar down, ...
                logger.info("OpenTimestamps calendar %s has no upgrade yet: %s", attestation.uri, e)
    if not changed:
        return ots_bytes, False
    ctx = BytesSerializationContext()
    detached.serialize(ctx)
    return ctx.getbytes(), True


def bitcoin_attestations(ots_bytes: bytes) -> list:
    """[(block height, merkle root as a block explorer prints it)] for every Bitcoin attestation."""
    detached = DetachedTimestampFile.deserialize(BytesDeserializationContext(ots_bytes))
    return sorted({(a.height, msg[::-1].hex()) for msg, a in detached.timestamp.all_attestations()
                   if isinstance(a, BitcoinBlockHeaderAttestation)})


async def fetch_block(height: int) -> Optional[dict]:
    """{"hash", "merkle_root", "time"} for a block height from a public explorer, or None if unreachable."""
    base = settings.OTS_BLOCK_EXPLORER.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{base}/block-height/{height}")
            r.raise_for_status()
            block_hash = r.text.strip()
            r = await client.get(f"{base}/block/{block_hash}")
            r.raise_for_status()
            block = r.json()
        return {"hash": block_hash, "merkle_root": block["merkle_root"],
                "time": datetime.fromtimestamp(block["timestamp"], timezone.utc).replace(tzinfo=None)}
    except (httpx.HTTPError, KeyError, ValueError) as e:
        logger.warning("Block explorer lookup for height %s failed: %s", height, e)
        return None


async def confirm_from_proof(db, work_id: str, ots_bytes: bytes) -> bool:
    """Mark a work confirmed if its proof carries a Bitcoin attestation; cross-check it with an explorer."""
    attestations = bitcoin_attestations(ots_bytes)
    if not attestations:
        return False
    height, merkle_root = attestations[0]  # the earliest block is the one that dates the record
    block = await fetch_block(height)
    update = {"anchor_status": "confirmed", "ots_block_height": height, "ots_confirmed_at": utcnow(),
              "ots_block_checked": False}
    if block is not None:
        if block["merkle_root"] != merkle_root:
            logger.error("Work %s: proof claims block %s but its merkle root does not match", work_id, height)
            await db.works.update_one({"id": work_id}, {"$set": {"anchor_status": "invalid", "ots_block_height": height}})
            return False
        update.update(ots_block_checked=True, ots_block_hash=block["hash"], ots_block_time=block["time"])
    await db.works.update_one({"id": work_id}, {"$set": update})
    return True


async def upgrade_pending(db) -> dict:
    """Upgrade every pending proof once. Returns counts; safe to run at any time (offline included)."""
    counts = {"checked": 0, "upgraded": 0, "confirmed": 0}
    if not settings.OTS_ENABLED:
        return counts
    query = {"ots_proof": {"$exists": True},
             "$or": [{"anchor_status": "pending"}, {"anchor_status": "confirmed", "ots_block_checked": False}]}
    async for doc in db.works.find(query, {"id": 1, "ots_proof": 1}):
        counts["checked"] += 1
        try:
            upgraded, changed = await asyncio.to_thread(upgrade_proof, bytes(doc["ots_proof"]))
        except Exception as e:  # a corrupt proof must not stop the others
            logger.warning("Could not read the proof of work %s: %s", doc["id"], e)
            continue
        if changed:
            counts["upgraded"] += 1
            await db.works.update_one({"id": doc["id"]}, {"$set": {"ots_proof": Binary(upgraded)}})
        if await confirm_from_proof(db, doc["id"], upgraded):
            counts["confirmed"] += 1
    return counts


async def upgrade_loop(db) -> None:
    """Background task: Bitcoin needs a few hours to confirm, so retry on an interval."""
    while True:
        try:
            counts = await upgrade_pending(db)
            if counts["checked"]:
                logger.info("OpenTimestamps upgrade: %s", counts)
        except Exception:
            logger.exception("OpenTimestamps upgrade run failed")
        await asyncio.sleep(settings.OTS_UPGRADE_MINUTES * 60)


if __name__ == "__main__":
    from app.db import db as _db
    print("OpenTimestamps upgrade:", asyncio.run(upgrade_pending(_db)))
