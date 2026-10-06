"""Image storage. Local disk for now; keep the interface small so it can move to S3/Cloudinary."""
import os
import uuid

from app.config import settings

FORMAT_EXT = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp", "GIF": "gif", "BMP": "bmp", "TIFF": "tiff"}


def upload_dir() -> str:
    path = settings.UPLOAD_DIR or os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(path, exist_ok=True)
    return path


def save_image(image_bytes: bytes, image_format: str | None, name: str | None = None, folder: str = "") -> str:
    """Save bytes and return the relative path served under /uploads."""
    ext = FORMAT_EXT.get((image_format or "").upper(), "jpg")
    rel = f"{folder + '/' if folder else ''}{name or uuid.uuid4()}.{ext}"
    full = os.path.join(upload_dir(), rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "wb") as f:
        f.write(image_bytes)
    return rel


def read_image(rel: str) -> bytes | None:
    full = os.path.join(upload_dir(), rel)
    if not os.path.isfile(full):
        return None
    with open(full, "rb") as f:
        return f.read()


def image_url(rel: str | None) -> str | None:
    return f"/uploads/{rel}" if rel else None
