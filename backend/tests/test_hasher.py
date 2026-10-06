import re
import secrets
import time

import imagehash
import numpy as np
import pytest

from app.config import get_config
from app.core.hasher import HASH_PARAMS, compute_hashes, hamming
from app.types import hex_to_bits
from tests.images import flat, photo_like, to_bytes


def test_hash_params_metadata():
    assert "imagehash_version" in HASH_PARAMS
    assert HASH_PARAMS["phash"] == {"hash_size": 8}
    assert HASH_PARAMS["dhash"] == {"hash_size": 8}
    assert HASH_PARAMS["ahash"] == {"hash_size": 8}
    assert HASH_PARAMS["whash"] == {"hash_size": 8, "image_scale": 256, "mode": "haar"}


def test_whash_params():
    cfg = get_config()
    assert HASH_PARAMS["whash"]["image_scale"] == 256
    for seed in range(5):
        img = photo_like(seed)
        h = compute_hashes(img, cfg)
        expected_whash = str(imagehash.whash(img.convert("L"), hash_size=8, image_scale=256, mode="haar"))
        assert h.whash == expected_whash, f"Seed {seed} failed whash check"


def test_hash_format_and_determinism():
    cfg = get_config()
    img = photo_like(7)
    h1 = compute_hashes(img, cfg)
    h2 = compute_hashes(img, cfg)

    hex_pattern = re.compile(r"^[0-9a-f]{16}$")
    for name in ["phash", "dhash", "ahash", "whash"]:
        val1 = getattr(h1, name)
        val2 = getattr(h2, name)
        assert hex_pattern.match(val1), f"{name} '{val1}' does not match hex pattern"
        assert val1 == val2


def test_legacy_parity():
    cfg = get_config()
    for seed in range(20):
        img = photo_like(seed)
        h = compute_hashes(img, cfg)
        legacy_phash = str(imagehash.phash(img))
        assert h.phash == legacy_phash, f"Seed {seed} failed parity check"


def test_jpeg_reencoding_robustness():
    cfg = get_config()
    for seed in range(20):
        img = photo_like(seed)
        raw_jpeg = to_bytes(img, "JPEG", quality=70)
        from app.core.ingest import ingest

        ingested = ingest(raw_jpeg, cfg.limits)
        h_orig = compute_hashes(img, cfg)
        h_jpeg = compute_hashes(ingested.image, cfg)
        dist = hamming(h_orig.phash, h_jpeg.phash)
        assert dist <= 8, f"Seed {seed} failed JPEG robustness check: dist={dist}"


def test_different_seeds_distinctness():
    cfg = get_config()
    for i in range(20):
        img1 = photo_like(i)
        img2 = photo_like(i + 100)
        h1 = compute_hashes(img1, cfg)
        h2 = compute_hashes(img2, cfg)
        dist = hamming(h1.phash, h2.phash)
        assert dist > 8, f"Pair {i}, {i + 100} failed distinctness check: dist={dist}"


def test_low_detail_detection():
    cfg = get_config()
    flat_img = flat(128)
    h_flat = compute_hashes(flat_img, cfg)
    assert h_flat.low_detail is True
    assert h_flat.grey_std < 1.0

    photo_img = photo_like(0)
    h_photo = compute_hashes(photo_img, cfg)
    assert h_photo.low_detail is False
    assert h_photo.grey_std >= cfg.low_detail.grey_std_min


def test_large_image_grey_std_consistency():
    cfg = get_config()
    large_img = photo_like(42, size=(5000, 4000))
    h = compute_hashes(large_img, cfg)

    full_arr = np.asarray(large_img.convert("L"), dtype=np.float32)
    full_std = float(full_arr.std())
    assert abs(h.grey_std - full_std) <= 1.0


def test_hamming_helper():
    assert hamming("0000000000000000", "00000000000000ff") == 8
    test_h = "c3a1f0e4b2d59687"
    assert hamming(test_h, test_h) == 0


def test_db_parity_hamming(db_conn, clean_db):
    for _ in range(100):
        h_a = secrets.token_hex(8)
        h_b = secrets.token_hex(8)
        py_dist = hamming(h_a, h_b)

        with db_conn.cursor() as cur:
            cur.execute(
                "SELECT CAST(%s AS bit(64)) <~> CAST(%s AS bit(64))",
                (hex_to_bits(h_a), hex_to_bits(h_b)),
            )
            db_dist = cur.fetchone()[0]

        assert py_dist == db_dist


@pytest.mark.slow
def test_speed():
    cfg = get_config()
    img = photo_like(1234, size=(1024, 1024))

    latencies_ms = []
    for _ in range(20):
        t0 = time.perf_counter()
        compute_hashes(img, cfg)
        t1 = time.perf_counter()
        latencies_ms.append((t1 - t0) * 1000.0)

    median_latency = float(np.median(latencies_ms))
    assert median_latency < 50.0, f"Median latency {median_latency:.2f}ms exceeds 50ms limit"


@pytest.mark.slow
def test_speed_large_input():
    cfg = get_config()
    img = photo_like(5678, size=(4032, 3024))

    latencies_ms = []
    for _ in range(5):
        t0 = time.perf_counter()
        compute_hashes(img, cfg)
        t1 = time.perf_counter()
        latencies_ms.append((t1 - t0) * 1000.0)

    median_latency = float(np.median(latencies_ms))
    assert median_latency < 150.0, f"Median latency {median_latency:.2f}ms exceeds 150ms limit"
