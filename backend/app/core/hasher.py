from dataclasses import dataclass

import imagehash
import numpy as np
from PIL import Image

from app.config import AppConfig

HASH_PARAMS = {
    "imagehash_version": imagehash.__version__,
    "phash": {"hash_size": 8},
    "dhash": {"hash_size": 8},
    "ahash": {"hash_size": 8},
    "whash": {"hash_size": 8, "mode": "haar"},
}


@dataclass(frozen=True)
class Hashes:
    phash: str
    dhash: str
    ahash: str
    whash: str  # 16-char lowercase hex each
    low_detail: bool
    grey_std: float


def compute_hashes(img: Image.Image, cfg: AppConfig) -> Hashes:
    """Compute classical perceptual hashes (pHash, dHash, aHash, wHash) and low-detail classification."""
    g = img.convert("L")
    w, h = g.size
    max_side = max(w, h)

    if max_side > 1024:
        scale = 1024.0 / max_side
        new_w = max(1, round(w * scale))
        new_h = max(1, round(h * scale))
        g_scaled = g.resize((new_w, new_h), Image.Resampling.BOX)
        arr = np.asarray(g_scaled, dtype=np.float32)
    else:
        arr = np.asarray(g, dtype=np.float32)

    grey_std = float(arr.std())
    low_detail = bool(grey_std < cfg.low_detail.grey_std_min)

    return Hashes(
        phash=str(imagehash.phash(g, hash_size=8)),
        dhash=str(imagehash.dhash(g, hash_size=8)),
        ahash=str(imagehash.average_hash(g, hash_size=8)),
        whash=str(imagehash.whash(g, hash_size=8, mode="haar")),
        low_detail=low_detail,
        grey_std=grey_std,
    )


def hamming(a: str, b: str) -> int:
    """Compute Hamming distance between two 16-character hexadecimal hashes."""
    return (int(a, 16) ^ int(b, 16)).bit_count()
