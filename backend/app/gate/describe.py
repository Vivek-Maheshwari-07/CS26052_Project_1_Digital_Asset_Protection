"""What changed: a plain-language description of how a copy differs from the registered original.

The gate already measures everything needed: the alignment (G2 homography), the copy warped into the
original's frame before and after colour correction (G3), and where pixels still differ. This module
turns those measurements into facts a person can check by looking at the two images:

  - how much of the original the copy shows, and which sides were cut off;
  - whether the original sits inside a larger picture (borders, collage, screenshot);
  - resolution, rotation, mirroring and perspective (a photo of a screen or a print);
  - brightness, contrast, saturation / black-and-white, colour temperature, blur;
  - where content differs, and whether detail was added there or removed.

Only measurements are reported, never intent or tools. Thresholds are deliberately conservative: a
change is mentioned only when it is clearly visible, so every sentence can be verified by eye.
"""
from typing import Optional

import cv2
import numpy as np

from app.gate.dense import DenseResult, _normalize_photometric
from app.gate.settings import settings
from app.gate.verify import VerifyResult

# A change is reported only above these (all chosen so the change is visible side by side)
MIN_KEPT_FOR_CROP = 0.95       # shows < 95% of the original -> "cropped"
MIN_SIDE_CUT = 0.03            # a side counts as cut when > 3% of that dimension is missing
MAX_ORIGINAL_SHARE = 0.85      # original fills < 85% of the copy -> "placed inside a larger image"
RESIZE_LOW, RESIZE_HIGH = 0.85, 1.2
MIN_ROTATION_DEG = 1.5
MIN_KEYSTONE = 0.06            # opposite edges differ by > 6% -> perspective distortion
MIN_BRIGHTNESS = 6.0           # L* units (0-100)
CONTRAST_LOW, CONTRAST_HIGH = 0.8, 1.2
COLOURFUL = 12.0               # chroma of a pixel that clearly has a colour (not white/grey/black)
MIN_COLOURFUL_SHARE = 0.03     # saturation is judged only if >= 3% of the original is colourful
CLIPPED = 250                  # copy pixel at/above this in any channel: blown-out highlight
MIN_CLIPPED_NOTE = 0.03
GRAYSCALE_CHROMA = 0.15        # copy keeps < 15% of the original's colour -> black and white
SATURATION_LOW, SATURATION_HIGH = 0.75, 1.3
MIN_TINT = 5.0                 # b*/a* shift for warmer/cooler/tinted
BLUR_RATIO, SHARPEN_RATIO = 0.45, 2.2
MIN_REGION_SHARE = 0.004       # changed regions smaller than 0.4% of the overlap are ignored
MAX_REGIONS = 5
DETAIL_RATIO = 1.6             # edge energy ratio that separates "added" from "removed"
LOST_DETAIL = 0.35             # copy keeps < 35% of the original's local detail -> removed / smoothed over
MAX_LOCAL_LOSS = 0.4           # ...unless that is true almost everywhere (then it is a blur, reported as such)
MIN_GLOBAL_DETAIL = 0.6        # ...or the copy as a whole keeps < 60% of the original's detail
GAINED_DETAIL = 2.5            # copy has > 2.5x the original's local detail -> something drawn on top (text outlines)
MAX_GLOBAL_DETAIL = 1.6        # ...unless the whole copy is that much sharper/noisier (reported as sharpening)
DETAIL_WINDOW = 31
MIN_OVERLAP_FOR_KIND = 0.3     # a pixel-change region mostly covered by lost/gained detail takes that kind


def _quad(w: int, h: int) -> np.ndarray:
    return np.float32([[0, 0], [w, 0], [w, h], [0, h]])


def _project(pts: np.ndarray, H: np.ndarray) -> np.ndarray:
    return cv2.perspectiveTransform(pts.reshape(-1, 1, 2).astype(np.float64), H.astype(np.float64)).reshape(-1, 2)


def _overlap_area(rect: np.ndarray, quad: np.ndarray) -> float:
    """Area of a (convex) projected quadrilateral inside a rectangle; 0 if it is degenerate."""
    quad = quad.astype(np.float32)
    if cv2.contourArea(quad, oriented=True) < 0:
        quad = quad[::-1].copy()
    try:
        area, _ = cv2.intersectConvexConvex(rect, quad)
    except cv2.error:
        return 0.0
    return max(0.0, float(area))


def _where(cx: float, cy: float) -> str:
    """Rough position of a point given as fractions of the width and height."""
    row = "top" if cy < 1 / 3 else "bottom" if cy > 2 / 3 else ""
    col = "left" if cx < 1 / 3 else "right" if cx > 2 / 3 else ""
    if row and col:
        return f"{row} {col}"
    if row or col:
        return f"{row or col} {'edge' if row else 'side'}"
    return "centre"


def _pct(x: float) -> str:
    return f"{round(100 * x)}%"


def _geometry(v: VerifyResult, d: DenseResult, query_size, target_size) -> list:
    items = []
    th, tw = d.target_work.shape[:2]
    qh, qw = d.query_work.shape[:2]
    H = v.homography
    t_rect, q_rect = _quad(tw, th), _quad(qw, qh)
    copy_in_original = _project(q_rect, H)

    # How much of the original is visible in the copy, and which sides were cut
    kept = _overlap_area(t_rect, copy_in_original) / (tw * th)
    if kept < MIN_KEPT_FOR_CROP:
        xs, ys = np.clip(copy_in_original[:, 0], 0, tw), np.clip(copy_in_original[:, 1], 0, th)
        cuts = {"left": xs.min() / tw, "right": 1 - xs.max() / tw, "top": ys.min() / th, "bottom": 1 - ys.max() / th}
        sides = [f"{side} ({_pct(c)})" for side, c in sorted(cuts.items(), key=lambda kv: -kv[1]) if c > MIN_SIDE_CUT]
        items.append({
            "kind": "crop", "value": round(kept, 3),
            "label": f"cropped to {_pct(kept)}",
            "detail": f"Only {_pct(kept)} of the original is shown" + (f"; cut from the {', '.join(sides)}." if sides else "."),
        })

    # Is the original only part of a bigger picture (borders, collage, a screenshot)?
    try:
        original_in_copy = _project(t_rect, np.linalg.inv(H))
        share = _overlap_area(q_rect, original_in_copy) / (qw * qh)
    except np.linalg.LinAlgError:
        share = 1.0
    if share < MAX_ORIGINAL_SHARE:
        items.append({
            "kind": "embedded", "value": round(share, 3),
            "label": "placed inside a larger image",
            "detail": f"The original fills only {_pct(share)} of the copy; the rest is other content, borders or background "
                      "(a collage, a screenshot or a post).",
        })

    # Resolution of the copy relative to the original, in each one's own pixels. Measured from the
    # area the whole copy covers in the original's frame, which stays right under perspective.
    sq, st = qw / max(1, query_size[0]), tw / max(1, target_size[0])
    scale_work = float(np.sqrt(abs(cv2.contourArea(copy_in_original.astype(np.float32))) / (qw * qh)))
    resolution = st / max(1e-6, scale_work * sq)
    if resolution < RESIZE_LOW:
        items.append({"kind": "resized", "value": round(resolution, 3), "label": f"shrunk to {_pct(resolution)} size",
                      "detail": f"Saved at a lower resolution: {_pct(resolution)} of the original's width and height."})
    elif resolution > RESIZE_HIGH:
        items.append({"kind": "resized", "value": round(resolution, 3), "label": f"enlarged to {_pct(resolution)} size",
                      "detail": f"Upscaled to {_pct(resolution)} of the original's width and height."})

    # Mirroring and rotation. The gate tries the copy as-is and mirrored; an upside-down flip
    # shows up as "mirrored + rotated 180 degrees". H maps the copy onto the original, so the copy
    # itself was turned the opposite way.
    rotation = -float(v.rotation)
    if v.flip == "h" and abs(rotation) > 135:
        items.append({"kind": "flip", "value": "vertical", "label": "flipped upside down",
                      "detail": "The image was flipped upside down (mirrored top to bottom)."})
        rotation = rotation - 180 if rotation > 0 else rotation + 180
    elif v.flip:
        items.append({"kind": "flip", "value": "horizontal", "label": "mirrored",
                      "detail": "The image was mirrored left to right."})
    if abs(rotation) >= MIN_ROTATION_DEG:
        # Image y points down, so a positive angle here is clockwise on screen
        way = "clockwise" if rotation > 0 else "counterclockwise"
        deg = round(abs(rotation))
        items.append({"kind": "rotation", "value": round(rotation, 1), "label": f"rotated {deg}°",
                      "detail": f"Rotated {deg}° {way}."})

    # Perspective: opposite edges of the copy's outline no longer the same length (keystone)
    e = [np.linalg.norm(copy_in_original[(i + 1) % 4] - copy_in_original[i]) for i in range(4)]
    keystone = max(abs(e[0] - e[2]) / max(e[0], e[2], 1e-6), abs(e[1] - e[3]) / max(e[1], e[3], 1e-6))
    if keystone > MIN_KEYSTONE and v.method == "sift":
        items.append({"kind": "perspective", "value": round(float(keystone), 3), "label": "seen at an angle",
                      "detail": "The copy is distorted in perspective, as when a screen or a print is photographed at an angle."})
    return items, resolution


def _detail(rgb: np.ndarray) -> np.ndarray:
    """Band-pass detail (Laplacian after a light blur). The blur makes it insensitive to the
    sub-pixel softening every alignment warp causes, while a real blur still removes it."""
    g = cv2.GaussianBlur(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 1.2)
    return cv2.Laplacian(g, cv2.CV_32F)


def _lab(rgb: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(rgb.astype(np.float32) / 255.0, cv2.COLOR_RGB2LAB)


def _clipped(d: DenseResult) -> np.ndarray:
    """Pixels blown out to white in the copy but not in the original, when the copy as a whole was made
    brighter or more contrasty: their detail is gone because of that edit, not a content change.
    Without such an edit, new pure-white pixels are content (white text, a sticker) and stay in."""
    none = np.zeros(d.valid_mask.shape, bool)
    if d.warped_raw is None or d.valid_mask.sum() < 500:
        return none
    lt = _lab(d.target_work)[d.valid_mask][:, 0]
    lq = _lab(d.warped_raw)[d.valid_mask][:, 0]
    if lq.mean() - lt.mean() < MIN_BRIGHTNESS and lq.std() < CONTRAST_HIGH * lt.std():
        return none
    return (d.warped_raw >= CLIPPED).any(axis=2) & ~(d.target_work >= CLIPPED).any(axis=2)


def _photometric(d: DenseResult, same_pixels: np.ndarray, resolution: float, clipped: np.ndarray) -> list:
    if d.warped_raw is None or same_pixels.sum() < 500:
        return []
    items = []
    t, q = _lab(d.target_work)[same_pixels], _lab(d.warped_raw)[same_pixels]

    dl = float(q[:, 0].mean() - t[:, 0].mean())
    if abs(dl) >= MIN_BRIGHTNESS:
        blown = float(clipped[d.valid_mask].mean())
        items.append({"kind": "brightness", "value": round(dl, 1), "label": "brighter" if dl > 0 else "darker",
                      "detail": f"Made {'brighter' if dl > 0 else 'darker'} ({abs(dl):.0f} points of lightness on a 0-100 scale)"
                                + (f"; {_pct(blown)} of the image became pure white, losing its detail." if dl > 0 and blown >= MIN_CLIPPED_NOTE else ".")})
    contrast = float(q[:, 0].std() / max(1e-6, t[:, 0].std()))
    if contrast > CONTRAST_HIGH or contrast < CONTRAST_LOW:
        more = contrast > 1
        items.append({"kind": "contrast", "value": round(contrast, 2), "label": f"{'more' if more else 'less'} contrast",
                      "detail": f"Contrast {'increased' if more else 'reduced'} ({_pct(contrast)} of the original's)."})

    # Saturation is judged on the original's coloured pixels: a mostly white or grey picture would
    # otherwise dilute any change to its few colours.
    chroma = lambda lab: np.hypot(lab[:, 1], lab[:, 2])  # noqa: E731
    colourful = chroma(t) >= COLOURFUL
    sat = None
    if colourful.mean() >= MIN_COLOURFUL_SHARE:
        sat = float(chroma(q[colourful]).mean() / chroma(t[colourful]).mean())
        if not d.chroma_compared or sat < GRAYSCALE_CHROMA:
            items.append({"kind": "grayscale", "value": round(sat, 2), "label": "turned black and white",
                          "detail": "Converted to black and white (grayscale)."})
            return items + _sharpness(d, same_pixels, resolution)
        if sat < SATURATION_LOW or sat > SATURATION_HIGH:
            more = sat > 1
            items.append({"kind": "saturation", "value": round(sat, 2),
                          "label": "more vivid colours" if more else "faded colours",
                          "detail": f"Colours made {'more' if more else 'less'} saturated ({_pct(sat)} of the original's)."})
    elif not d.chroma_compared:
        items.append({"kind": "grayscale", "value": 0.0, "label": "turned black and white",
                      "detail": "Converted to black and white (grayscale)."})
        return items + _sharpness(d, same_pixels, resolution)

    # Colour cast, over all pixels (a tint shows most on whites and greys): what is left after the best
    # uniform saturation change q_ab ~ s * t_ab, since fading a red towards grey also lowers b*.
    s = float((q[:, 1:] * t[:, 1:]).sum() / max(1e-6, (t[:, 1:] ** 2).sum()))
    da, db = (float(v) for v in (q[:, 1:] - s * t[:, 1:]).mean(axis=0))
    if abs(db) >= MIN_TINT:
        items.append({"kind": "temperature", "value": round(db, 1), "label": "warmer" if db > 0 else "cooler",
                      "detail": f"Colours shifted {'warmer (towards yellow)' if db > 0 else 'cooler (towards blue)'}."})
    elif abs(da) >= MIN_TINT:
        items.append({"kind": "tint", "value": round(da, 1), "label": f"tinted {'magenta' if da > 0 else 'green'}",
                      "detail": f"Colours tinted towards {'magenta' if da > 0 else 'green'}."})
    return items + _sharpness(d, same_pixels, resolution)


def _sharpness(d: DenseResult, same_pixels: np.ndarray, resolution: float) -> list:
    """Blur or sharpening, only when the copy is not smaller than the original (a smaller copy enlarged
    into the original's frame always looks softer, which is not an edit)."""
    items = []
    if resolution >= RESIZE_LOW:
        lt, lq = _detail(d.target_work)[same_pixels], _detail(d.warped_raw)[same_pixels]
        ratio = float(lq.var() / max(1e-6, lt.var()))
        if ratio < BLUR_RATIO:
            items.append({"kind": "blur", "value": round(ratio, 2), "label": "blurred",
                          "detail": "Blurred or softened: fine detail is much weaker than in the original."})
        elif ratio > SHARPEN_RATIO:
            items.append({"kind": "sharpen", "value": round(ratio, 2), "label": "sharpened or grainier",
                          "detail": "Sharpened, or noise/grain added: fine detail is much stronger than in the original."})
    return items


def _detail_changes(d: DenseResult, valid: np.ndarray) -> tuple:
    """(lost, gained): where the copy has far less local detail than the original (removed, smoothed or
    painted over) or far more (text or a logo outline drawn on top). Such edits can keep the colours,
    or be absorbed by the colour correction, so the pixel residual alone misses them. A change that
    covers most of the image is a blur or sharpening of the whole picture, reported separately."""
    none = np.zeros_like(valid)
    # Stay a window away from the copy's own border (a crop or rotation edge): the copy stops there while
    # the original continues, which would read as a strong local change in detail.
    inner = cv2.erode(d.valid_mask.astype(np.uint8), np.ones((DETAIL_WINDOW + 8, DETAIL_WINDOW + 8), np.uint8))
    valid = valid & inner.astype(bool)
    if d.warped_raw is None or valid.sum() < 500:
        return none, none
    box = (DETAIL_WINDOW, DETAIL_WINDOW)
    et = cv2.blur(np.abs(_detail(d.target_work)), box)
    eq = cv2.blur(np.abs(_detail(d.warped_raw)), box)
    limit = MAX_LOCAL_LOSS * d.valid_mask.sum()
    opened = lambda m: cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)).astype(bool)  # noqa: E731

    lost = none
    textured = et > np.median(et[d.valid_mask])
    if eq[textured & valid].mean() >= MIN_GLOBAL_DETAIL * et[textured & valid].mean():
        lost = opened(textured & (eq < LOST_DETAIL * et) & valid)
        lost = lost if lost.sum() <= limit else none

    gained = none
    if eq[valid].mean() <= MAX_GLOBAL_DETAIL * et[valid].mean():
        busy = eq > np.percentile(eq[valid], 75)
        gained = opened(busy & (eq > GAINED_DETAIL * et) & valid)
        gained = gained if gained.sum() <= limit else none
    return lost, gained


def _changed(residual: np.ndarray, valid: np.ndarray) -> np.ndarray:
    changed = ((residual > settings.change_threshold) & valid).astype(np.uint8)
    changed = cv2.morphologyEx(changed, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    return cv2.dilate(changed, np.ones((9, 9), np.uint8)).astype(bool)


def changed_mask(d: DenseResult) -> np.ndarray:
    """Where the aligned copy really differs from the original, after a colour correction fitted only to
    the unchanged pixels.

    G3 fits its colour correction to every overlapping pixel, which is right for grading but lets the
    edit itself skew the fit: added white text with a black outline bends the tone curve, and dark logos
    elsewhere then show up as 'changed'. Refitting without the clearly changed pixels removes that.
    Used for the 'changed regions' image and the description; grading is untouched."""
    valid = d.valid_mask
    changed = _changed(d.residual_image, valid)
    if d.warped_raw is None or valid.sum() < 500:
        return changed
    reference = d.target_work if d.chroma_compared else np.repeat(
        cv2.cvtColor(d.target_work, cv2.COLOR_RGB2GRAY)[..., None], 3, axis=2)
    for _ in range(2):
        fit = (valid & ~changed).astype(np.uint8) * 255
        if (fit > 0).sum() < 0.5 * valid.sum():
            break  # most of the image changed: keep G3's own residual
        adjusted = _normalize_photometric(reference, d.warped_raw, fit)
        residual = np.abs(reference.astype(np.float32) - adjusted.astype(np.float32)).mean(axis=2)
        changed = _changed(residual, valid)
    return changed


def _regions(d: DenseResult, resolution: float, clipped: np.ndarray) -> tuple:
    """Changed regions of the aligned copy: strong pixel differences (changed_mask), plus local loss or
    gain of detail when the copy is not lower resolution than the original. Each place is reported once:
    a pixel-change region mostly covered by lost (or gained) detail is called removed (or added), and
    detail changes away from any pixel change form regions of their own.
    Blown-out highlights are left out: they come from a brightness edit, reported as such."""
    th, tw = d.target_work.shape[:2]
    valid = d.valid_mask & ~cv2.dilate(clipped.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
    changed = changed_mask(d) & valid
    none = np.zeros_like(changed)
    lost, gained = _detail_changes(d, valid) if resolution >= RESIZE_LOW else (none, none)
    near_change = cv2.dilate(changed.astype(np.uint8), np.ones((DETAIL_WINDOW, DETAIL_WINDOW), np.uint8)).astype(bool)
    overlap = max(1, int(valid.sum()))

    def detail_energy(img):
        g = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
        return np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1))
    et, eq = detail_energy(d.target_work), detail_energy(d.warped_raw if d.warped_raw is not None else d.warped_work)

    found = []
    for mask, fixed_kind in ((changed, None), (lost & ~near_change, "removed"), (gained & ~near_change, "added")):
        n, labels, stats, centroids = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
        for i in range(1, n):
            area = int(stats[i, cv2.CC_STAT_AREA])
            if area / overlap < MIN_REGION_SHARE:
                continue
            sel = labels == i
            if fixed_kind:
                kind = fixed_kind
            elif gained[sel].mean() >= MIN_OVERLAP_FOR_KIND:
                kind = "added"
            elif lost[sel].mean() >= MIN_OVERLAP_FOR_KIND:
                kind = "removed"
            else:
                ratio = float(eq[sel].mean() + 1) / float(et[sel].mean() + 1)
                kind = "added" if ratio > DETAIL_RATIO else "removed" if ratio < 1 / DETAIL_RATIO else "altered"
            x, y, w, h = (int(stats[i, k]) for k in (cv2.CC_STAT_LEFT, cv2.CC_STAT_TOP, cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT))
            cx, cy = centroids[i]
            found.append({"kind": kind, "where": _where(cx / tw, cy / th), "share": round(area / (tw * th), 4),
                          "box": [round(x / tw, 4), round(y / th, 4), round(w / tw, 4), round(h / th, 4)]})
    regions = sorted(found, key=lambda r: -r["share"])[:MAX_REGIONS]
    return regions, changed | lost | gained


_REGION_TEXT = {
    "added": ("something added", "New detail appears here that is not in the original (text, a logo, a sticker or an object)."),
    "removed": ("something removed", "Detail from the original is missing here (removed, painted over or smoothed out)."),
    "altered": ("content changed", "The content here differs from the original (covered, replaced or redrawn)."),
}


def _join(labels: list) -> str:
    if len(labels) <= 1:
        return "".join(labels)
    return ", ".join(labels[:-1]) + " and " + labels[-1]


def describe_changes(v: VerifyResult, d: DenseResult, query_size, target_size, classification: str,
                     work_id: Optional[str] = None) -> dict:
    """{"headline", "items": [{kind, label, detail, value}], "regions": [...], "unchanged_share"} for one
    aligned candidate. `query_size` / `target_size` are the full-resolution (w, h) of copy and original.

    For a lead (the pixels don't agree, so it may be another photo of the same scene) only the framing is
    described: colour and content differences between two separate photos are not edits."""
    evidence = classification in ("TIER1", "TIER2")
    items, resolution = _geometry(v, d, query_size, target_size)
    regions = []
    if evidence:
        clipped = _clipped(d)
        regions, changed = _regions(d, resolution, clipped)
        items += _photometric(d, d.valid_mask & ~changed, resolution, clipped)

    for kind in ("added", "removed", "altered"):
        here = [r for r in regions if r["kind"] == kind]
        if here:
            places = _join(sorted({r["where"] for r in here}, key=[r["where"] for r in here].index))
            label, detail = _REGION_TEXT[kind]
            share = sum(r["share"] for r in here)
            items.append({"kind": f"content_{kind}", "value": round(share, 4), "label": f"{label} ({places})",
                          "detail": f"{detail} Location: {places}; about {_pct(share) if share >= 0.01 else '<1%'} of the image."})

    unchanged = round(1.0 - float(d.changed_frac), 3)
    if items:
        headline = _join([i["label"] for i in items])
        headline = headline[0].upper() + headline[1:] + "."
    elif evidence:
        headline = "No visible edits: same framing, size, colours and content as the original."
    else:
        headline = "Same framing as the original."
    if evidence:
        footer = (f"Everything else matches the original pixel for pixel after alignment and colour correction "
                  f"({_pct(unchanged)} of the compared detail).")
    else:
        footer = ("The two images line up, but their pixels differ widely, so this may be a different photograph of "
                  "the same scene rather than an edit of the original. Only the framing is described; treat it as a "
                  "lead, not proof.")
    return {"work_id": work_id, "headline": headline, "items": items, "regions": regions,
            "unchanged_share": unchanged, "footer": footer, "grade": "evidence" if evidence else "lead"}
