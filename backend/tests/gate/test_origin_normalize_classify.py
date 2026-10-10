"""G0 normalisation, G4 classification and the origin module."""
import io

import numpy as np
import pytest
from PIL import Image, PngImagePlugin

from app.gate import origin
from app.gate.classify import classify_candidate
from app.gate.normalize import InvalidImageError, decode_rgb, normalize_image
from app.gate.settings import settings


# ---------------------------------------------------------------- G0

def test_normalize_trims_uniform_borders():
    arr = np.full((100, 100, 3), 128, np.uint8)
    arr[:10] = arr[-10:] = 0
    arr[:, :10] = arr[:, -10:] = 0
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, "PNG")
    img, box, uniform = normalize_image(buf.getvalue())
    assert box == (10, 10, 90, 90) and img.size == (80, 80) and not uniform


def test_normalize_fully_uniform_image_is_returned_unchanged():
    buf = io.BytesIO()
    Image.new("RGB", (50, 40), (255, 255, 255)).save(buf, "PNG")
    img, box, uniform = normalize_image(buf.getvalue())
    assert img.size == (50, 40) and box == (0, 0, 50, 40) and uniform


def test_decode_applies_exif_orientation():
    img = Image.new("RGB", (200, 100), "white")
    exif = img.getexif()
    exif[274] = 6  # displayed rotated 90 degrees
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif)
    assert decode_rgb(buf.getvalue()).size == (100, 200)


def test_normalize_rejects_non_image():
    with pytest.raises(InvalidImageError):
        normalize_image(b"not an image")


# ---------------------------------------------------------------- G4

def test_classify_grades():
    assert classify_candidate(True, 0, 0, 10.0, 2.0, 0.5).grade == "TIER1"
    assert classify_candidate(True, 0, 0, 30.0, 5.0, 0.4).grade == "TIER2"
    assert classify_candidate(True, 0, 0, 30.0, 15.0, 0.1).grade == "RELATED_DIFFERENT_CAPTURE"
    assert classify_candidate(False, 0.9, 0.1, None, None, None).grade == "TIER3"
    assert classify_candidate(False, 0.1, 0.0, None, None, None).grade == "NONE"


def test_shadow_tier2_falls_through_to_related_instead_of_vanishing():
    r = classify_candidate(True, 0, 0, 30.0, 5.0, 0.4)
    assert settings.modes.tier2 == "shadow"
    assert r.grade == "TIER2" and r.active_grade == "RELATED_DIFFERENT_CAPTURE"


def test_active_tier2_is_reported_as_itself(monkeypatch):
    monkeypatch.setattr(settings.modes, "tier2", "active")
    assert classify_candidate(True, 0, 0, 30.0, 5.0, 0.4).active_grade == "TIER2"


def test_shadow_tier3_produces_no_claim():
    r = classify_candidate(False, 0.9, 0.1, None, None, None)
    assert r.grade == "TIER3" and r.active_grade == "NONE"


# ---------------------------------------------------------------- origin

def _png(meta=None):
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (10, 200, 30)).save(buf, "PNG", pnginfo=meta)
    return buf.getvalue()


def test_plain_image_has_no_provenance():
    r = origin.check_origin(_png())
    assert r.provenance_found is False
    assert r.details == ["no provenance metadata found"]
    assert r.ai_generated_declared is None


def test_xmp_digital_source_type_is_detected():
    xmp = ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><rdf:Description '
           'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/>'
           '</rdf:RDF></x:xmpmeta>')
    meta = PngImagePlugin.PngInfo()
    meta.add_itxt("XML:com.adobe.xmp", xmp)
    r = origin.check_origin(_png(meta))
    assert r.provenance_found and r.ai_generated_declared is True
    assert "trainedalgorithmicmedia" in r.details[0].lower()


def test_exif_alone_is_not_provenance():
    img = Image.new("RGB", (32, 32))
    exif = img.getexif()
    exif[271] = "SomeCamera"
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif)
    r = origin.check_origin(buf.getvalue())
    assert r.provenance_found is False and any("EXIF" in n for n in r.notes)


def test_c2pa_absent_is_reported_as_not_found():
    buf = io.BytesIO()
    Image.new("RGB", (32, 32)).save(buf, "JPEG")
    assert origin.check_c2pa(buf.getvalue()).get("found") is False


def test_c2pa_manifest_with_ai_source_type_sets_declared(monkeypatch):
    monkeypatch.setattr(origin, "check_c2pa", lambda b: {"found": True, "validation_state": "Valid",
                                                         "ai_declared": True, "digital_source_types": ["trainedAlgorithmicMedia"]})
    r = origin.check_origin(_png())
    assert r.provenance_found and r.ai_generated_declared is True
