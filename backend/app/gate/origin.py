"""Provenance and origin signals: C2PA manifests and IPTC DigitalSourceType (deterministic),
plus stubs for an ML detector and a watermark reader.

Absence of a signal is reported as "no provenance metadata found", never as "real".
"""
import io
import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from PIL import Image

from app.gate.settings import settings

try:
    import c2pa
except ImportError:  # optional dependency
    c2pa = None

logger = logging.getLogger(__name__)

# IPTC NewsCodes digital source types that declare algorithmic / AI involvement.
AI_SOURCE_TYPES = {
    "trainedalgorithmicmedia",
    "compositewithtrainedalgorithmicmedia",
    "algorithmicmedia",
    "compositesynthetic",
}
_DST_RE = re.compile(rb"digitalsourcetype/([A-Za-z]+)", re.IGNORECASE)
_MIME = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "TIFF": "image/tiff",
         "GIF": "image/gif", "HEIF": "image/heif", "AVIF": "image/avif"}


@dataclass
class MLDetectorResult:
    available: bool
    reason_code: str
    probability_ai: Optional[float] = None
    model_name: Optional[str] = None


@dataclass
class WatermarkResult:
    available: bool
    reason_code: str
    watermark_found: Optional[bool] = None
    payload: Optional[str] = None


@dataclass
class OriginResult:
    provenance_found: bool
    details: List[str]
    ml_detector: MLDetectorResult
    watermark: WatermarkResult
    ai_generated_declared: Optional[bool] = None  # True only when signed/declared metadata says so
    c2pa: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)  # informational, not provenance


class MLDetectorPlugin:
    """Stub interface for ML detection (shadow: failed validation on 52 real photos)."""
    def check(self, image_bytes: bytes) -> MLDetectorResult:
        return MLDetectorResult(available=False, reason_code="not_implemented")


class WatermarkPlugin:
    """Stub interface for watermark detection (no usable public detector)."""
    def check(self, image_bytes: bytes) -> WatermarkResult:
        return WatermarkResult(available=False, reason_code="not_implemented")


def _find_values(obj: Any, key: str) -> List[str]:
    """Every string value stored under `key` anywhere in a nested JSON structure."""
    found: List[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key and isinstance(v, str):
                found.append(v)
            else:
                found.extend(_find_values(v, key))
    elif isinstance(obj, list):
        for v in obj:
            found.extend(_find_values(v, key))
    return found


def check_c2pa(image_bytes: bytes) -> Dict[str, Any]:
    """Read a C2PA manifest from the file. {"found": False} when there is none or it can't be read."""
    if c2pa is None:
        return {"found": False, "error": "c2pa library not installed"}
    try:
        with Image.open(io.BytesIO(image_bytes)) as probe:
            mime = _MIME.get((probe.format or "").upper())
    except Exception:
        mime = None
    try:
        reader = c2pa.Reader(mime, io.BytesIO(image_bytes))
    except Exception as e:
        if "ManifestNotFound" in type(e).__name__ or "ManifestNotFound" in str(e):
            return {"found": False}
        logger.debug("C2PA read failed: %s", e)
        return {"found": False, "error": f"{type(e).__name__}: {e}"}

    try:
        data = json.loads(reader.json())
        source_types = [s.rsplit("/", 1)[-1] for s in _find_values(data, "digitalSourceType")]
        try:
            state = str(reader.get_validation_state())
        except Exception:
            state = None
        active = (data.get("manifests") or {}).get(data.get("active_manifest"), {})
        return {
            "found": True,
            "validation_state": state,
            "claim_generator": active.get("claim_generator"),
            "digital_source_types": source_types,
            "ai_declared": any(s.lower() in AI_SOURCE_TYPES for s in source_types),
        }
    except Exception as e:
        logger.debug("C2PA parse failed: %s", e)
        return {"found": True, "error": f"{type(e).__name__}: {e}"}
    finally:
        try:
            reader.close()
        except Exception:
            pass


def extract_metadata_signals(image_bytes: bytes) -> Dict[str, Any]:
    """IPTC DigitalSourceType from embedded XMP (scanned in the raw bytes, so any container works)
    and a note on whether EXIF is present. EXIF is not provenance."""
    out: Dict[str, Any] = {"source_types": [], "ai_declared": False, "exif": False}
    out["source_types"] = sorted({m.decode().lower() for m in _DST_RE.findall(image_bytes[:8_000_000])})
    out["ai_declared"] = any(s in AI_SOURCE_TYPES for s in out["source_types"])
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            out["exif"] = bool(img.getexif())
    except Exception as e:
        logger.debug("Metadata extraction failed: %s", e)
    return out


def check_origin(image_bytes: bytes) -> OriginResult:
    """Run all deterministic origin checks."""
    details: List[str] = []
    notes: List[str] = []
    ai_declared: Optional[bool] = None

    meta = extract_metadata_signals(image_bytes)
    if meta["source_types"]:
        details.append("XMP DigitalSourceType: " + ", ".join(meta["source_types"]) + ".")
        ai_declared = meta["ai_declared"] or None
    if meta["exif"]:
        notes.append("EXIF metadata present (not provenance).")

    c2pa_info: Dict[str, Any] = {}
    if settings.modes.c2pa == "active":
        c2pa_info = check_c2pa(image_bytes)
        if c2pa_info.get("found"):
            state = c2pa_info.get("validation_state")
            details.append("C2PA manifest found" + (f" (validation: {state})." if state else "."))
            if c2pa_info.get("ai_declared"):
                ai_declared = True
        elif c2pa_info.get("error"):
            notes.append(f"C2PA check could not run: {c2pa_info['error']}")

    provenance_found = bool(details)
    if not provenance_found:
        details = ["no provenance metadata found"]

    return OriginResult(
        provenance_found=provenance_found,
        details=details,
        ml_detector=MLDetectorPlugin().check(image_bytes),
        watermark=WatermarkPlugin().check(image_bytes),
        ai_generated_declared=ai_declared,
        c2pa=c2pa_info,
        notes=notes,
    )
