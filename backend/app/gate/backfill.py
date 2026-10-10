"""Backfill gate features (DINOv2 vector + SIFT cache) for works registered before the gate existed.

Only writes to `gate_features` and the SIFT cache directory; registry entries (the hash chain)
are never modified.

    python -m app.gate.backfill [--dry-run]
"""
import argparse
import asyncio
import logging

from motor.motor_asyncio import AsyncIOMotorClient

from app import storage
from app.config import settings
from app.gate.features import compute_and_store, ensure_gate_indexes, has_dino, has_sift

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print what would be done.")
    args = parser.parse_args()

    db = AsyncIOMotorClient(settings.MONGO_URI)[settings.MONGO_DB]
    if not args.dry_run:
        await ensure_gate_indexes(db)

    logger.info("Checking %d works for backfill...", await db.works.count_documents({}))
    added_dino = added_sift = failed = 0

    async for doc in db.works.find({}, {"id": 1, "image_path": 1}):
        wid = doc["id"]
        need_dino = not await has_dino(db, wid)
        need_sift = not has_sift(wid)
        if not (need_dino or need_sift):
            continue

        raw = storage.read_image(doc.get("image_path")) if doc.get("image_path") else None
        if not raw:
            logger.warning("Could not load image bytes for work %s. Skipping.", wid)
            failed += 1
            continue

        if args.dry_run:
            logger.info("[Dry Run] work %s: dino=%s sift=%s", wid, need_dino, need_sift)
            continue
        try:
            done = await compute_and_store(db, wid, raw, dino=need_dino, sift=need_sift)
        except Exception as e:
            logger.warning("Work %s failed: %s", wid, e)
            failed += 1
            continue
        added_dino += done["dino"]
        added_sift += done["sift"]

    logger.info("Done. Added %d DINO vectors and %d SIFT caches; %d works skipped or failed.",
                added_dino, added_sift, failed)


if __name__ == "__main__":
    asyncio.run(main())
