"""The fingerprint stack of a registered work: one digest per technique, plus a composite over all of them.

Every layer is derived from the stored original (or from the vectors stored for it) when the certificate
is issued. Only the registry entry hash is part of the tamper-evident chain; the other layers show which
independent methods describe the work, so a copy that defeats one of them is still described by the others.
"""
import hashlib
from typing import Optional

import numpy as np

from app import storage


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _vector_digest(vec) -> str:
    return _sha(np.asarray(vec, dtype=np.float32).tobytes())


def _sift_digest(work_id: str) -> Optional[str]:
    try:
        from app.gate.verify import FEATURE_VERSION, cache_dir
        path = cache_dir() / f"{work_id}_{FEATURE_VERSION}.npz"
        if not path.exists():
            return None
        data = np.load(path)
        return _sha(np.asarray(data["kps"], np.float32).tobytes() + np.asarray(data["descs"], np.float32).tobytes())
    except Exception:
        return None


async def build_stack(db, record: dict) -> dict:
    """{"layers": [{name, technique, digest | None}], "composite": hex | None}."""
    raw = storage.read_image(record["image_path"]) if record.get("image_path") else None
    gate = await db.gate_features.find_one({"work_id": record["id"], "model": "dinov2-small"})
    dino = None
    if gate and gate.get("vector"):
        crops = np.asarray(gate["crop_vectors"], np.float32).tobytes() if gate.get("crop_vectors") else b""
        dino = _sha(np.asarray(gate["vector"], np.float32).tobytes() + crops)

    layers = [
        {"name": "File content", "technique": "SHA-256 of the stored original file", "digest": _sha(raw) if raw else None},
        {"name": "Perceptual hash", "technique": "pHash, 64-bit DCT of the image structure", "digest": record.get("phash")},
        {"name": "Semantic embedding", "technique": "OpenCLIP ViT-B/32, 512 dimensions (SHA-256 of the vector)",
         "digest": _vector_digest(record["embedding"]) if record.get("embedding") else None},
        {"name": "Structural embedding", "technique": "DINOv2-small, 384 dimensions + 5 crop vectors (SHA-256)", "digest": dino},
        {"name": "Local features", "technique": "SIFT keypoints and descriptors (SHA-256)", "digest": _sift_digest(record["id"])},
        {"name": "Registry entry", "technique": "SHA-256 hash chain entry, anchored in Bitcoin via OpenTimestamps",
         "digest": record.get("entry_hash")},
    ]
    digests = [layer["digest"] for layer in layers]
    composite = _sha("|".join(d or "-" for d in digests).encode()) if all(digests) else None
    return {"layers": layers, "composite": composite}
