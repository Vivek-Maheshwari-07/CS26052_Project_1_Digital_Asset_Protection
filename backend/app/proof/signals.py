"""Authorship signals carried by the uploaded file itself, read at registration.

They must be read before the stored copy is stripped of metadata (ingestion.strip_metadata):
  - a C2PA manifest (Content Credentials) signed by a camera or an editing app;
  - camera EXIF: make, model and when the photo was taken.

A verified C2PA manifest is strong evidence of where an image came from. Camera EXIF is easy to forge,
so it is recorded as supporting detail only and never raises the proof level on its own.
"""
import io
import logging
from datetime import datetime
from typing import Optional

from PIL import Image

logger = logging.getLogger(__name__)

EXIF_IFD = 0x8769
MAKE, MODEL = 0x010F, 0x0110
DATE_TIME_ORIGINAL = 0x9003


def _camera(image_bytes: bytes) -> Optional[dict]:
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            exif = img.getexif()
            make, model = (str(exif.get(t) or "").strip("\x00 ") for t in (MAKE, MODEL))
            taken = exif.get_ifd(EXIF_IFD).get(DATE_TIME_ORIGINAL)
    except Exception:
        return None
    taken_at = None
    if taken:
        try:
            taken_at = datetime.strptime(str(taken).strip("\x00 "), "%Y:%m:%d %H:%M:%S")
        except ValueError:
            pass
    if not (make or model or taken_at):
        return None
    return {"make": make or None, "model": model or None, "taken_at": taken_at}


def _c2pa(image_bytes: bytes) -> Optional[dict]:
    from app.gate.origin import check_c2pa
    try:
        info = check_c2pa(image_bytes)
    except Exception as e:  # the reader is optional and must never block a registration
        logger.debug("C2PA check failed at registration: %s", e)
        return None
    if not info.get("found"):
        return None
    return {k: info.get(k) for k in ("verdict", "claim_generator", "ai_declared", "digital_source_types")}


def upload_signals(image_bytes: bytes) -> dict:
    """{"c2pa": {...} | None, "camera": {...} | None} for the file as uploaded."""
    return {"c2pa": _c2pa(image_bytes), "camera": _camera(image_bytes)}
