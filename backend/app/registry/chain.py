import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone
from app.registry.models import WorkRecord

# Serialises appends so two concurrent registrations can't share a prev_hash.
_append_lock = asyncio.Lock()


def canonical_json(record_dict: dict) -> str:
    """The exact text whose SHA-256 is the record's entry_hash."""
    dt = record_dict["created_at"]
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt_str = dt.isoformat()
    else:
        dt_str = str(dt)

    canonical = {
        "id": record_dict["id"],
        "owner_name": record_dict["owner_name"],
        "title": record_dict["title"],
        "phash": record_dict["phash"],
        "embedding": record_dict["embedding"],
        "created_at": dt_str,
        "prev_hash": record_dict["prev_hash"]
    }
    # Ownership and pipeline provenance are part of the tamper-evident record.
    # Records created before these fields existed have none, so their hashes
    # stay unchanged (optional-include keeps old entry_hash values valid).
    if record_dict.get("user_id"):
        canonical["user_id"] = record_dict["user_id"]
    if record_dict.get("pipeline_version"):
        canonical["pipeline_version"] = record_dict["pipeline_version"]
    if record_dict.get("low_detail") is not None:
        canonical["low_detail"] = bool(record_dict["low_detail"])

    return json.dumps(canonical, sort_keys=True)


def compute_entry_hash(record_dict: dict) -> str:
    return hashlib.sha256(canonical_json(record_dict).encode('utf-8')).hexdigest()


async def append_to_chain(db, record_data: dict) -> WorkRecord:
    async with _append_lock:
        # 1. Fetch the last record's entry_hash
        last_record = await db.works.find_one(sort=[("_id", -1)])
        prev_hash = last_record["entry_hash"] if last_record else "GENESIS"

        # 2. Build the new record
        new_record_dict = {
            "id": record_data.get("id") or str(uuid.uuid4()),
            "user_id": record_data.get("user_id"),
            "owner_name": record_data["owner_name"],
            "title": record_data["title"],
            "phash": record_data["phash"],
            "embedding": record_data["embedding"],
            "width": record_data.get("width"),
            "height": record_data.get("height"),
            "image_path": record_data.get("image_path"),
            "low_detail": record_data.get("low_detail"),
            "pipeline_version": record_data.get("pipeline_version"),
            "created_at": datetime.now(timezone.utc).replace(microsecond=0),
            "prev_hash": prev_hash
        }

        # 3. Compute entry_hash
        new_record_dict["entry_hash"] = compute_entry_hash(new_record_dict)

        # 4. Insert into the database
        record = WorkRecord(**new_record_dict)
        await db.works.insert_one(record.model_dump())
        return record


async def verify_chain(db) -> tuple[bool, str | None]:
    expected_prev = "GENESIS"

    cursor = db.works.find({}, {"ots_proof": 0}).sort("_id", 1)
    async for doc in cursor:
        # Check prev_hash matches the previous record's entry_hash
        if doc["prev_hash"] != expected_prev:
            return False, doc["id"]

        # Recompute entry_hash
        if compute_entry_hash(doc) != doc["entry_hash"]:
            return False, doc["id"]

        expected_prev = doc["entry_hash"]

    return True, None


async def verify_record(db, doc: dict) -> dict:
    """Check one record: its hash recomputes, and it is linked to its neighbours."""
    intact = compute_entry_hash(doc) == doc["entry_hash"]
    if doc["prev_hash"] == "GENESIS":
        prev_ok = await db.works.count_documents({"_id": {"$lt": doc["_id"]}}) == 0
    else:
        prev = await db.works.find_one({"entry_hash": doc["prev_hash"]}, {"_id": 1})
        prev_ok = prev is not None
    nxt = await db.works.find_one({"_id": {"$gt": doc["_id"]}}, {"prev_hash": 1}, sort=[("_id", 1)])
    next_ok = nxt is None or nxt["prev_hash"] == doc["entry_hash"]
    position = await db.works.count_documents({"_id": {"$lte": doc["_id"]}})
    return {"intact": intact, "linked": prev_ok and next_ok, "position": position}
