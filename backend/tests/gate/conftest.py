"""Synthetic, SIFT-friendly test images (no model weights, no network)."""
import io

import cv2
import numpy as np
import pytest
from PIL import Image


def textured_image(seed: int, size=(640, 480)) -> Image.Image:
    """Smooth colour noise plus random shapes: plenty of distinctive corners, reproducible per seed."""
    rng = np.random.default_rng(seed)
    w, h = size
    base = rng.integers(0, 256, (h // 16 + 1, w // 16 + 1, 3), dtype=np.uint8)
    img = cv2.resize(base, (w, h), interpolation=cv2.INTER_CUBIC)
    for _ in range(60):
        color = tuple(int(c) for c in rng.integers(0, 256, 3))
        x, y = int(rng.integers(0, w)), int(rng.integers(0, h))
        kind = rng.integers(0, 3)
        if kind == 0:
            cv2.circle(img, (x, y), int(rng.integers(6, 40)), color, -1)
        elif kind == 1:
            cv2.rectangle(img, (x, y), (x + int(rng.integers(10, 80)), y + int(rng.integers(10, 80))), color, -1)
        else:
            cv2.line(img, (x, y), (int(rng.integers(0, w)), int(rng.integers(0, h))), color, int(rng.integers(1, 5)))
    img = cv2.GaussianBlur(img, (0, 0), 1.0)
    return Image.fromarray(img)


def to_bytes(img: Image.Image, fmt="PNG") -> bytes:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


@pytest.fixture(scope="session")
def make_image():
    return textured_image


@pytest.fixture(scope="session")
def as_bytes():
    return to_bytes


@pytest.fixture(scope="session")
def orig_img() -> Image.Image:
    return textured_image(1)


@pytest.fixture(scope="session")
def other_img() -> Image.Image:
    return textured_image(2)
