"""2A "what changed": the plain-language description must name each known edit and nothing else."""
import pytest
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

from app.gate.dense import compute_dense_evidence
from app.gate.describe import describe_changes
from app.gate.verify import extract_features, verify_geometry


@pytest.fixture(scope="module")
def target(orig_img):
    kps, descs = extract_features(orig_img)
    return orig_img, kps, descs


def describe(target, suspect, classification="TIER1"):
    img, kps, descs = target
    v = verify_geometry(suspect, kps, descs, *img.size)
    assert v.credible, v.reason
    d = compute_dense_evidence(img, suspect, v)
    return describe_changes(v, d, suspect.size, img.size, classification, "w1")


def kinds(desc):
    return [i["kind"] for i in desc["items"]]


def test_an_unedited_copy_has_no_changes(target):
    desc = describe(target, target[0].copy())
    assert desc["items"] == [] and desc["regions"] == []
    assert desc["headline"].startswith("No visible edits")
    assert desc["grade"] == "evidence"


def test_crop_reports_the_share_kept_and_the_sides_cut(target):
    img = target[0]
    w, h = img.size
    desc = describe(target, img.crop((int(0.2 * w), 0, w, int(0.75 * h))))
    assert kinds(desc) == ["crop"]
    crop = desc["items"][0]
    assert abs(crop["value"] - 0.6) < 0.03
    assert "left (20%)" in crop["detail"] and "bottom (25%)" in crop["detail"]


@pytest.mark.parametrize("edit, kind, word", [
    (ImageOps.mirror, "flip", "mirrored"),
    (ImageOps.flip, "flip", "upside down"),
    (lambda im: im.rotate(8, resample=Image.BICUBIC, expand=True, fillcolor="white"), "rotation", "counterclockwise"),
    (lambda im: im.rotate(-8, resample=Image.BICUBIC, expand=True, fillcolor="white"), "rotation", "clockwise"),
    (lambda im: im.resize((im.width // 2, im.height // 2), Image.LANCZOS), "resized", "50%"),
    (lambda im: ImageOps.grayscale(im).convert("RGB"), "grayscale", "black and white"),
    (lambda im: ImageEnhance.Brightness(im).enhance(1.35), "brightness", "brighter"),
    (lambda im: ImageEnhance.Color(im).enhance(0.4), "saturation", "less saturated"),
    (lambda im: im.filter(ImageFilter.GaussianBlur(3)), "blur", "Blurred"),
])
def test_each_edit_is_named(target, edit, kind, word):
    desc = describe(target, edit(target[0]))
    found = [i for i in desc["items"] if i["kind"] == kind]
    assert found, f"expected {kind}, got {kinds(desc)}"
    assert word in found[0]["detail"]


def test_rotation_by_turning_does_not_report_a_flip(target):
    assert "flip" not in kinds(describe(target, target[0].rotate(-8, expand=True, fillcolor="white")))


def test_a_faded_copy_is_not_called_cooler_or_warmer(target):
    assert "temperature" not in kinds(describe(target, ImageEnhance.Color(target[0]).enhance(0.4)))


def test_added_text_is_located(target):
    img = target[0].copy()
    w, h = img.size
    ImageDraw.Draw(img).rectangle((int(0.62 * w), int(0.78 * h), int(0.95 * w), int(0.93 * h)), fill="white", outline="black", width=4)
    desc = describe(target, img)
    regions = [r for r in desc["regions"] if r["kind"] in ("added", "altered")]
    assert regions and all("bottom" in r["where"] for r in regions), desc["regions"]
    x, y, bw, bh = regions[0]["box"]
    assert 0.55 < x < 0.7 and 0.7 < y < 0.85  # the box points at the edit


def test_a_lead_describes_only_the_framing(target):
    img = target[0]
    w, h = img.size
    edited = ImageOps.grayscale(img.crop((0, 0, int(0.7 * w), h))).convert("RGB")
    desc = describe(target, edited, classification="RELATED_DIFFERENT_CAPTURE")
    assert kinds(desc) == ["crop"]
    assert desc["grade"] == "lead" and "lead, not proof" in desc["footer"]
