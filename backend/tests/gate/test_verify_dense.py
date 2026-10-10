"""G2 geometric verification and G3/G4 on synthetic images: copies must verify and grade as pixel
evidence; unrelated images must not verify; changed content must not grade as Tier 1."""
import pytest
from PIL import Image, ImageEnhance, ImageOps

from app.gate.classify import classify_candidate
from app.gate.dense import compute_dense_evidence
from app.gate.verify import extract_features, verify_geometry


def _crop(img, frac):
    w, h = img.size
    s = frac ** 0.5
    cw, ch = int(w * s), int(h * s)
    left, top = (w - cw) // 2, (h - ch) // 2
    return img.crop((left, top, left + cw, top + ch))


EDITS = {
    "self": lambda im: im.copy(),
    "crop_50": lambda im: _crop(im, 0.5),
    "crop_30": lambda im: _crop(im, 0.3),
    "hflip": ImageOps.mirror,
    "resize_50": lambda im: im.resize((im.width // 2, im.height // 2)),
    "rotate_15": lambda im: im.rotate(15, expand=True),
    "bright_contrast": lambda im: ImageEnhance.Contrast(ImageEnhance.Brightness(im).enhance(1.3)).enhance(1.4),
    "grayscale": lambda im: ImageOps.grayscale(im).convert("RGB"),
    "saturation_x1.5": lambda im: ImageEnhance.Color(im).enhance(1.5),
}


@pytest.fixture(scope="module")
def target(orig_img):
    kps, descs = extract_features(orig_img)
    return orig_img, kps, descs


@pytest.mark.parametrize("name", list(EDITS))
def test_copy_verifies_and_is_pixel_evidence(target, name):
    img, kps, descs = target
    suspect = EDITS[name](img)
    v = verify_geometry(suspect, kps, descs, *img.size)
    assert v.credible, f"{name}: {v.reason} ({v.inlier_count} inliers)"
    d = compute_dense_evidence(img, suspect, v)
    c = classify_candidate(True, 0.0, 0.0, d.residual_p90, d.flow_median_px, d.edge_corr_fine)
    assert c.grade == "TIER1", f"{name}: {c.grade} res_p90={d.residual_p90:.1f} flow={d.flow_median_px:.2f}"


def test_flip_is_detected_as_flipped(target):
    img, kps, descs = target
    v = verify_geometry(ImageOps.mirror(img), kps, descs, *img.size)
    assert v.credible and v.flipped


def test_unrelated_image_does_not_verify(target, other_img):
    img, kps, descs = target
    v = verify_geometry(other_img, kps, descs, *img.size)
    assert not v.credible


def test_crop_reprojects_tightly(target):
    img, kps, descs = target
    v = verify_geometry(_crop(img, 0.5), kps, descs, *img.size)
    assert v.tight_inlier_frac >= 0.9  # the repeated-pattern guard must not penalise real crops


def test_changed_content_is_not_tier1(target, make_image):
    """Paste a different picture over ~40% of the image: still aligned, but no longer unchanged pixels."""
    img, kps, descs = target
    edited = img.copy()
    w, h = img.size
    patch = make_image(99, (int(w * 0.8), int(h * 0.5))).resize((int(w * 0.8), int(h * 0.5)))
    edited.paste(patch, (int(w * 0.1), int(h * 0.25)))
    v = verify_geometry(edited, kps, descs, *img.size)
    assert v.credible
    d = compute_dense_evidence(img, edited, v)
    c = classify_candidate(True, 0.0, 0.0, d.residual_p90, d.flow_median_px, d.edge_corr_fine)
    assert c.grade != "TIER1"


def test_repeated_pattern_alone_is_not_credible(make_image):
    """Two different arrangements of the same repeated motif share many look-alike keypoints
    but no single transform explains them."""
    import numpy as np

    motif = np.array(make_image(7, (64, 64)))

    def arrange(seed):
        r = np.random.default_rng(seed)
        canvas = np.zeros((384, 384, 3), np.uint8)
        for gy in range(6):
            for gx in range(6):
                m = np.rot90(motif, int(r.integers(0, 4))) if r.random() < 0.5 else motif
                canvas[gy * 64:(gy + 1) * 64, gx * 64:(gx + 1) * 64] = m
        return Image.fromarray(canvas)

    a, b = arrange(10), arrange(20)
    kps, descs = extract_features(a)
    v = verify_geometry(b, kps, descs, *a.size)
    assert not v.credible or v.tight_inlier_frac < 0.9
