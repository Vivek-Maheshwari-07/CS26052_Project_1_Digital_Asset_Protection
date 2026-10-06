import io

import numpy as np
from PIL import Image, ImageDraw


def photo_like(seed: int, size: tuple[int, int] = (640, 480)) -> Image.Image:
    """Deterministic synthetic image factory with smooth gradient, shapes, and noise."""
    rng = np.random.default_rng(seed)
    w, h = size
    x = np.linspace(0, 1, w, endpoint=True, dtype=np.float32)
    y = np.linspace(0, 1, h, endpoint=True, dtype=np.float32)
    xx, yy = np.meshgrid(x, y)

    c0 = rng.uniform(0.2, 0.8, size=3)
    c1 = rng.uniform(0.2, 0.8, size=3)
    c2 = rng.uniform(0.2, 0.8, size=3)

    r = (xx * c0[0] + yy * c1[0] + c2[0] * 0.5) * 255.0
    g = (xx * c0[1] + yy * c1[1] + c2[1] * 0.5) * 255.0
    b = (xx * c0[2] + yy * c1[2] + c2[2] * 0.5) * 255.0

    base_arr = np.stack([r, g, b], axis=-1)
    base_arr = np.clip(base_arr, 0, 255).astype(np.uint8)
    img = Image.fromarray(base_arr, mode="RGB")

    draw = ImageDraw.Draw(img)
    num_shapes = int(rng.integers(12, 21))
    for _ in range(num_shapes):
        shape_type = rng.choice(["ellipse", "rectangle"])
        x0 = int(rng.integers(0, max(1, w - 10)))
        y0 = int(rng.integers(0, max(1, h - 10)))
        x1 = int(rng.integers(x0 + 5, min(w, x0 + max(15, w // 2))))
        y1 = int(rng.integers(y0 + 5, min(h, y0 + max(15, h // 2))))
        color = tuple(rng.integers(0, 256, size=3).tolist())
        if shape_type == "ellipse":
            draw.ellipse([x0, y0, x1, y1], fill=color)
        else:
            draw.rectangle([x0, y0, x1, y1], fill=color)

    arr = np.array(img, dtype=np.float32)
    noise = rng.normal(0.0, 4.0, size=arr.shape)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, mode="RGB")


def flat(grey: int = 128, size: tuple[int, int] = (256, 256)) -> Image.Image:
    """Solid color image."""
    return Image.new("RGB", size, (grey, grey, grey))


def to_bytes(img: Image.Image, fmt: str, **save_kw) -> bytes:
    """Encode image to bytes with specified format and parameters."""
    buf = io.BytesIO()
    img.save(buf, format=fmt, **save_kw)
    return buf.getvalue()


def jpeg_with_orientation(img: Image.Image, orientation: int = 6) -> bytes:
    """Encode JPEG with EXIF orientation tag 0x0112."""
    exif = img.getexif()
    exif[0x0112] = orientation
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def rgba_transparent(size: tuple[int, int] = (128, 128)) -> Image.Image:
    """Fully transparent RGBA image."""
    return Image.new("RGBA", size, (0, 0, 0, 0))
