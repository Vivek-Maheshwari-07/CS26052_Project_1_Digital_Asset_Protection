"""Source evidence: files that usually only the real creator has, checked against the registered work.

  - a layered source file (Photoshop .psd/.psb, Krita .kra, Procreate .procreate) whose flattened
    image matches the work;
  - a larger original: the same picture at a higher resolution than the registered file;
  - a camera RAW file whose preview matches the work (when the preview can be decoded).

"Matches" means the gate's geometric verification (SIFT + MAGSAC) aligns it with the registered work,
the same test used for copies. Only the file's SHA-256, size and the outcome are kept; the file
itself is never stored, so a creator's source files do not leave their hands for good. The SHA-256
is timestamped (OpenTimestamps), proving the creator held this file at that time.
"""
import hashlib
import io
import zipfile
from pathlib import Path
from typing import Optional

from PIL import Image

from app import ingestion

LAYERED_EXT = {".psd", ".psb", ".kra", ".procreate", ".xcf", ".clip"}
RAW_EXT = {".dng", ".cr2", ".cr3", ".nef", ".arw", ".raf", ".orf", ".rw2", ".pef", ".srw"}
# Flattened image stored inside zip-based painting formats
ZIP_PREVIEWS = {".kra": ("mergedimage.png", "preview.png"), ".procreate": ("QuickLook/Thumbnail.png",)}
LARGER_BY = 1.15  # long side at least 15% larger than the registered file

KIND_TEXT = {
    "source_file": "Layered source file that matches the work",
    "larger_original": "Larger original that matches the work",
    "raw_file": "Camera RAW file that matches the work",
    "same_size": "Matches the work, but is no larger than the registered file, so it adds no proof",
    "unmatched": "Supporting file; it could not be matched to the work automatically",
    "unreadable": "Supporting file; its image could not be read, so it was not matched",
}
STRONG_KINDS = {"source_file", "larger_original", "raw_file"}


def _decode(data: bytes, ext: str) -> Optional[Image.Image]:
    """The flattened image of a file, or None. Pillow reads PSD composites, TIFF-based RAW previews
    and every normal format; zip-based painting apps keep a flattened PNG inside."""
    try:
        return ingestion.normalize(data)
    except ingestion.InvalidImageError:
        pass
    if ext in ZIP_PREVIEWS:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                names = set(z.namelist())
                for name in ZIP_PREVIEWS[ext]:
                    if name in names and z.getinfo(name).file_size < 100_000_000:
                        return ingestion.normalize(z.read(name))
        except (zipfile.BadZipFile, ingestion.InvalidImageError, KeyError):
            return None
    return None


def _matches(candidate: Image.Image, work_img: Image.Image) -> bool:
    from app.gate.verify import extract_features, verify_geometry
    kps, descs = extract_features(work_img)
    return verify_geometry(candidate, kps, descs, *work_img.size).credible


def analyse_source(data: bytes, filename: str, work_img: Image.Image) -> dict:
    """{"kind", "sha256", "size", "width", "height", "matched", "detail"} for one supporting file."""
    ext = Path(filename or "").suffix.lower()
    out = {"sha256": hashlib.sha256(data).hexdigest(), "size": len(data), "extension": ext or None,
           "width": None, "height": None, "matched": False}
    img = _decode(data, ext)
    if img is None:
        out["kind"] = "unreadable"
    else:
        out["width"], out["height"] = img.size
        out["matched"] = _matches(img, work_img)
        larger = max(img.size) >= LARGER_BY * max(work_img.size)
        if not out["matched"]:
            out["kind"] = "unmatched"
        elif ext in LAYERED_EXT:
            out["kind"] = "source_file"
        elif ext in RAW_EXT:
            out["kind"] = "raw_file"
        else:
            out["kind"] = "larger_original" if larger else "same_size"
    out["strong"] = out["kind"] in STRONG_KINDS
    out["detail"] = KIND_TEXT[out["kind"]]
    return out
