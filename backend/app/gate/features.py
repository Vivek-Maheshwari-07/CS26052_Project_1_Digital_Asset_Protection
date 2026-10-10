"""Per-work gate features: a DINOv2 vector (Mongo, `gate_features`) and a SIFT cache (disk).

Computed from the same normalised image the gate uses for suspects (EXIF-oriented, RGB, borders
trimmed), at registration time for new works and by `backfill` for older ones. These never touch
the registry hash chain.
"""
import asyncio
import logging
from typing import Optional

from PIL import Image

from app import storage
from app.gate.normalize import InvalidImageError, normalize_image
from app.gate.verify import FEATURE_VERSION, cache_dir, get_cached_features

logger = logging.getLogger(__name__)

DINO_MODEL = "dinov2-small"


async def ensure_gate_indexes(db) -> None:
    await db.gate_features.create_index([("work_id", 1), ("model", 1)], unique=True)


def has_sift(work_id: str) -> bool:
    return (cache_dir() / f"{work_id}_{FEATURE_VERSION}.npz").exists()


async def has_dino(db, work_id: str) -> bool:
    return await db.gate_features.count_documents({"work_id": work_id, "model": DINO_MODEL}) > 0


def load_target(image_path: Optional[str]) -> Optional[Image.Image]:
    """A registered work's stored image, normalised exactly like a suspect. None if unreadable."""
    raw = storage.read_image(image_path) if image_path else None
    if not raw:
        return None
    try:
        return normalize_image(raw)[0]
    except InvalidImageError:
        return None


async def compute_and_store(db, work_id: str, image_bytes: bytes, *, dino: bool = True, sift: bool = True) -> dict:
    """Compute and persist the DINOv2 vector and/or SIFT cache for one work."""
    from app.gate.retrieve import embed_dino  # lazy: importing it pulls in torch/transformers

    img, _, _ = normalize_image(image_bytes)
    done = {"dino": False, "sift": False}
    if dino:
        vec = await asyncio.to_thread(embed_dino, img)
        await db.gate_features.update_one(
            {"work_id": work_id, "model": DINO_MODEL},
            {"$set": {"vector": vec.tolist(), "feature_version": FEATURE_VERSION}},
            upsert=True,
        )
        done["dino"] = True
    if sift:
        await asyncio.to_thread(get_cached_features, work_id, FEATURE_VERSION, img)
        done["sift"] = True
    return done


async def compute_for_registration(db, work_id: str, image_bytes: bytes) -> None:
    """Background-task wrapper: a failure here must never fail the registration."""
    try:
        await compute_and_store(db, work_id, image_bytes)
    except Exception:
        logger.exception("Gate features could not be computed for work %s (run backfill later).", work_id)
