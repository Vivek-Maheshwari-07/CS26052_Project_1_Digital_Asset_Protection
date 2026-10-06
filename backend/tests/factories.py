import secrets
import uuid

import numpy as np


def random_hex_hash() -> str:
    return secrets.token_hex(8)


def random_unit_vector(dim: int) -> list[float]:
    v = np.random.randn(dim).astype(np.float32)
    norm = np.linalg.norm(v)
    if norm == 0:
        v[0] = 1.0
        norm = 1.0
    return (v / norm).tolist()


def image_row(**overrides) -> dict:
    unique_id = uuid.uuid4()
    row = {
        "id": unique_id,
        "owner_name": "Test Owner",
        "original_filename": "test.jpg",
        "file_path": f"storage/test_{unique_id}.jpg",
        "source_format": "JPEG",
        "sha256": secrets.token_hex(32),
        "width": 1920,
        "height": 1080,
        "phash": random_hex_hash(),
        "dhash": random_hex_hash(),
        "ahash": random_hex_hash(),
        "whash": random_hex_hash(),
        "low_detail": False,
        "clip_emb": random_unit_vector(512),
        "dino_emb": random_unit_vector(768),
        "clip_model": "openai/clip-vit-base-patch32",
        "dino_model": "facebook/dinov2-base",
        "config_version": "2026.10-1",
    }
    row.update(overrides)
    return row
