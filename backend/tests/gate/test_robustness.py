"""Behaviour added for real-world alterations: small crops, rotations/flips, flat art, blank
backgrounds, shared query features, crop-aware retrieval."""
import io

import numpy as np
import pytest
from PIL import Image, ImageDraw, ImageOps

from app.gate import verify as verify_mod
from app.gate.classify import classify_candidate
from app.gate.dense import compute_dense_evidence
from app.gate.retrieve import DINO_DIM, N_CROPS, DualIndex, score_index
from app.gate.verify import (QueryFeatures, VerifyResult, extract_features, verify_geometry,
                             verify_whole_image_ecc)


def _center_crop(img, frac):
    w, h = img.size
    s = frac ** 0.5
    cw, ch = int(w * s), int(h * s)
    left, top = (w - cw) // 2, (h - ch) // 2
    return img.crop((left, top, left + cw, top + ch))


def _grade(target, suspect, v):
    d = compute_dense_evidence(target, suspect, v)
    return classify_candidate(True, 0, 0, d.residual_p90, d.flow_median_px, d.edge_corr_fine,
                              d.residual_median, d.changed_frac, d.low_information, d.hp_ncc)


def _logo(seed, size=(600, 600)):
    r = np.random.default_rng(seed)
    im = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(im)
    for _ in range(5):
        x, y = (int(v) for v in r.integers(50, 450, 2))
        col = tuple(int(c) for c in r.integers(0, 200, 3))
        w, h = int(r.integers(60, 160)), int(r.integers(60, 160))
        (d.ellipse if r.random() < 0.5 else d.rectangle)([x, y, x + w, y + h], fill=col)
    return im


def _jpeg(im, quality, scale=1.0):
    if scale != 1.0:
        im = im.resize((int(im.width * scale), int(im.height * scale)))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality)
    return Image.open(io.BytesIO(buf.getvalue())).convert("RGB")


@pytest.fixture(scope="module")
def target(orig_img):
    kps, descs = extract_features(orig_img)
    return orig_img, kps, descs


# ---------------------------------------------------------------- geometry classes

@pytest.mark.parametrize("name,edit", [
    ("vflip", ImageOps.flip),
    ("rot90", lambda im: im.rotate(90, expand=True)),
    ("rot180", lambda im: im.rotate(180)),
    ("hflip_rot15", lambda im: ImageOps.mirror(im).rotate(15, expand=True)),
])
def test_flips_and_rotations_verify_as_pixel_evidence(target, name, edit):
    img, kps, descs = target
    suspect = edit(img)
    v = verify_geometry(suspect, kps, descs, *img.size)
    assert v.credible, f"{name}: {v.reason}"
    assert _grade(img, suspect, v).grade == "TIER1"


@pytest.mark.parametrize("frac", [0.25, 0.10, 0.05])
def test_small_crops_verify_by_containment(target, frac):
    img, kps, descs = target
    suspect = _center_crop(img, frac)
    v = verify_geometry(suspect, kps, descs, *img.size)
    assert v.credible, f"crop {frac}: {v.reason} ({v.inlier_count} inliers)"
    assert v.inlier_coverage_t < 0.15 <= v.inlier_coverage_q or frac == 0.25
    assert _grade(img, suspect, v).grade == "TIER1"


def test_shared_logo_stamp_is_not_containment(target, other_img):
    """The same small stamp in two otherwise different images must not verify."""
    img, kps, descs = target
    stamp = _center_crop(img, 0.03).resize((90, 70))
    other = other_img.copy()
    other.paste(stamp, (500, 380))
    assert not verify_geometry(other, kps, descs, *img.size).credible


def test_query_features_are_extracted_once_per_orientation(target, other_img, monkeypatch):
    img, kps, descs = target
    calls = []
    real = verify_mod.extract_features
    monkeypatch.setattr(verify_mod, "extract_features", lambda im: calls.append(1) or real(im))
    qf = QueryFeatures(other_img)
    for _ in range(3):  # three candidates
        verify_geometry(other_img, kps, descs, *img.size, qfeats=qf)
    assert len(calls) <= len(verify_mod.FLIP_MODES)


# ---------------------------------------------------------------- flat art

def test_flat_art_resized_copy_is_found_by_ecc_fallback():
    logo = _logo(1)
    copy = _jpeg(logo, 60, 0.7)
    kps, descs = extract_features(logo)
    v = verify_geometry(copy, kps, descs, *logo.size)
    assert not v.credible and v.low_feature  # too few keypoints for SIFT...
    v = verify_whole_image_ecc(copy, logo)  # ...but the whole image aligns
    assert v is not None and v.credible and v.method == "ecc"
    grade = _grade(logo, copy, v)
    assert grade.grade in ("TIER1", "TIER2") and grade.active_grade != "NONE"


def test_flat_art_unrelated_logo_is_rejected_by_fallback():
    assert verify_whole_image_ecc(_logo(2), _logo(1)) is None


def test_ecc_fallback_refuses_different_aspect_ratio():
    logo = _logo(1)
    assert verify_whole_image_ecc(logo.crop((0, 0, 600, 300)), logo) is None


# ---------------------------------------------------------------- blank backgrounds say nothing

def _identity(img):
    return VerifyResult(True, "credible", 40, 1.0, 1.0, 1.0, 0.0, 0.0, "", np.eye(3), np.zeros((0, 2)),
                        np.zeros((0, 2)))


def test_different_logos_sharing_a_blank_canvas_are_not_pixel_evidence():
    a, b = _logo(1), _logo(2)
    assert _grade(a, b, _identity(a)).grade != "TIER1"


def test_almost_blank_images_cannot_give_pixel_evidence():
    a = Image.new("RGB", (600, 600), "white")
    b = a.copy()
    ImageDraw.Draw(b).ellipse([300, 300, 312, 312], fill=(0, 0, 0))  # a single dot
    d = compute_dense_evidence(a, b, _identity(a))
    assert d.low_information
    assert _grade(a, b, _identity(a)).grade == "RELATED_DIFFERENT_CAPTURE"


# ---------------------------------------------------------------- transparency

def _sprite_bytes(make_image):
    """A textured ellipse on a transparent canvas whose hidden RGB is black (as in real sprite PNGs)."""
    rgb = np.array(make_image(4, (300, 400)))
    alpha = np.zeros((400, 300), np.uint8)
    yy, xx = np.ogrid[:400, :300]
    alpha[((xx - 150) / 120.0) ** 2 + ((yy - 200) / 170.0) ** 2 <= 1] = 255
    rgb[alpha == 0] = 0
    buf = io.BytesIO()
    Image.fromarray(np.dstack([rgb, alpha]), "RGBA").save(buf, "PNG")
    return buf.getvalue()


def _flattened_jpeg(png_bytes, bg):
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    canvas = Image.new("RGB", im.size, bg)
    canvas.paste(im, mask=im.getchannel("A"))
    buf = io.BytesIO()
    canvas.save(buf, "JPEG", quality=80)
    return buf.getvalue()


def test_ingestion_puts_transparency_on_white(make_image):
    from app import ingestion
    img = ingestion.normalize(_sprite_bytes(make_image))
    assert img.getpixel((2, 2)) == (255, 255, 255)  # not the hidden black


@pytest.mark.parametrize("bg", [(255, 255, 255), (0, 0, 0)])
def test_transparent_original_matches_reposts_on_any_background(make_image, bg):
    from app.gate.normalize import alpha_mask, normalize_image
    original = _sprite_bytes(make_image)
    target, crop_box, _ = normalize_image(original)
    alpha = alpha_mask(original, crop_box)
    assert alpha is not None and alpha.shape == (target.size[1], target.size[0])

    suspect, _, _ = normalize_image(_flattened_jpeg(original, bg))
    kps, descs = extract_features(target)
    v = verify_geometry(suspect, kps, descs, *target.size)
    assert v.credible, v.reason
    d = compute_dense_evidence(target, suspect, v, alpha)
    grade = classify_candidate(True, 0, 0, d.residual_p90, d.flow_median_px, d.edge_corr_fine,
                               d.residual_median, d.changed_frac, d.low_information, d.hp_ncc)
    assert grade.grade == "TIER1", f"bg={bg}: p90={d.residual_p90} chg={d.changed_frac}"


def test_opaque_image_has_no_alpha_mask(orig_img, as_bytes):
    from app.gate.normalize import alpha_mask
    assert alpha_mask(as_bytes(orig_img), (0, 0, *orig_img.size)) is None


# ---------------------------------------------------------------- classifier conditions

def test_tier1_needs_every_condition():
    ok = dict(residual_p90=10.0, flow_median=1.0, edge_corr=0.9, residual_median=2.0, changed_frac=0.02, hp_ncc=0.8)
    assert classify_candidate(True, 0, 0, **ok).grade == "TIER1"
    for key, bad in [("residual_median", 20.0), ("changed_frac", 0.4), ("hp_ncc", 0.01), ("residual_p90", 50.0),
                     ("flow_median", 5.0)]:
        assert classify_candidate(True, 0, 0, **{**ok, key: bad}).grade != "TIER1", key


def test_second_capture_from_almost_the_same_position_is_not_tier1():
    """Metrics of a real false Tier 1 found by the evaluation: a second handheld photo taken 7 s after the
    original, camera barely moved, only the cat's ears differ. It must not be pixel evidence."""
    r = classify_candidate(True, 0, 0, residual_p90=16.0, flow_median=0.55, edge_corr=0.88,
                           residual_median=5.0, changed_frac=0.005, hp_ncc=0.69)
    assert r.grade != "TIER1"


def test_route_b_accepts_a_high_p90_only_when_everything_else_is_exact():
    exact = dict(flow_median=0.3, edge_corr=0.95, residual_median=2.0, changed_frac=0.01, hp_ncc=None)
    assert classify_candidate(True, 0, 0, residual_p90=30.0, **exact).grade == "TIER1"   # flat art, edge ringing
    assert classify_candidate(True, 0, 0, residual_p90=30.0, **{**exact, "hp_ncc": 0.3}).grade != "TIER1"
    assert classify_candidate(True, 0, 0, residual_p90=30.0, **{**exact, "flow_median": 1.5}).grade != "TIER1"
    assert classify_candidate(True, 0, 0, residual_p90=30.0, **{**exact, "residual_median": 3.5}).grade != "TIER1"
    assert classify_candidate(True, 0, 0, residual_p90=50.0, **exact).grade != "TIER1"
    # route B needs the extra measurements; without them only the strict route applies
    assert classify_candidate(True, 0, 0, residual_p90=30.0, flow_median=0.3, edge_corr=0.95).grade != "TIER1"


def test_low_information_is_a_lead_not_evidence():
    r = classify_candidate(True, 0, 0, 1.0, 0.0, 1.0, 0.0, 0.0, low_information=True)
    assert r.grade == "RELATED_DIFFERENT_CAPTURE" and r.active_grade == "RELATED_DIFFERENT_CAPTURE"


# ---------------------------------------------------------------- crop-aware retrieval

def test_a_small_crop_is_retrieved_through_the_crop_vectors():
    rng = np.random.default_rng(0)
    unit = lambda v: v / np.linalg.norm(v)  # noqa: E731
    query = unit(rng.normal(size=DINO_DIM)).astype(np.float32)
    idx = DualIndex()
    idx.ids = ["whole_only", "has_crop"]
    idx.clip_emb = np.zeros((2, 512), np.float32)
    idx.dino_emb = np.stack([unit(rng.normal(size=DINO_DIM)), unit(rng.normal(size=DINO_DIM))]).astype(np.float32)
    crops = np.zeros((2, N_CROPS, DINO_DIM), np.float32)
    crops[1, 3] = query  # one quadrant of the second work is what the query shows
    idx.dino_crops = crops

    _, d_scores, from_crop = score_index(idx, {"clip": np.zeros((3, 512), np.float32), "dino": np.stack([query] * 3)})
    assert d_scores[1] > 0.99 and from_crop[1] and not from_crop[0]
    assert d_scores[1] > d_scores[0] + 0.5
