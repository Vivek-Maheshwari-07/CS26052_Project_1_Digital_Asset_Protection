"""G3: Dense evidence (warp, ECC refinement, photometric normalisation, residual, edge correlation, DIS flow).

Everything runs in the verification working frame (long side <= working_long_side), the same frame
the spike's thresholds were measured in. The query is warped into the target's working frame with
the G2 homography, so `q_inliers` / `t_inliers` from G2 index directly into `query_work` /
`target_work`.
"""
import logging
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image, ImageOps

from app.gate.settings import settings
from app.gate.verify import VerifyResult, working_scale

logger = logging.getLogger(__name__)

ECC_MAX_SHIFT_PX = 20.0  # ECC may only nudge the alignment, not re-fit it
ECC_MAX_LINEAR_DEV = 0.03
MIN_VALID_PIXELS = 100
PHOTOMETRIC_SAMPLES = 10000
SATURATION_HI, SATURATION_LO = 253, 2
SATURATION_MIN_KEEP = 0.2  # fall back to the full overlap if clipping leaves less than this share


@dataclass
class DenseResult:
    ecc_applied: bool
    ecc_correlation: float
    chroma_compared: bool  # False when the query is grayscale and only luminance was compared
    residual_median: float
    residual_p90: float
    ssim: float
    edge_corr_fine: float
    edge_corr_coarse: float
    flow_median_px: float
    flow_p90_px: float
    flow_frac_over_1px: float
    residual_image: np.ndarray  # uint8 grayscale |target - aligned query|, target working frame
    target_work: np.ndarray  # RGB, target working frame
    query_work: np.ndarray  # RGB, query working frame (mirrored when G2 matched the mirror)
    warped_work: np.ndarray  # RGB, query aligned to the target and photometrically normalised
    valid_mask: np.ndarray  # bool, pixels where the warped query overlaps the target


def _to_work(img: Image.Image, flip: bool = False) -> np.ndarray:
    if flip:
        img = ImageOps.mirror(img)
    arr = np.array(img.convert("RGB"))
    h, w = arr.shape[:2]
    s = working_scale(w, h)
    if s < 1.0:
        arr = cv2.resize(arr, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
    return arr


TONE_BINS = 32
TONE_MIN_BIN_SAMPLES = 20


def _tone_curve(q: np.ndarray, t: np.ndarray) -> np.ndarray:
    """Monotone intensity map q -> t: per-bin median of the target, forced non-decreasing.

    Unlike a linear gain/offset this also undoes clipping and gamma from brightness/contrast
    edits, but being monotone and global it cannot hide spatial (content) changes.
    """
    edges = np.linspace(0, 256, TONE_BINS + 1)
    which = np.clip(np.digitize(q, edges) - 1, 0, TONE_BINS - 1)
    xs, ys = [], []
    for b in range(TONE_BINS):
        sel = which == b
        if sel.sum() >= TONE_MIN_BIN_SAMPLES:
            xs.append(float(np.median(q[sel])))
            ys.append(float(np.median(t[sel])))
    if len(xs) < 2:
        return np.arange(256, dtype=np.float32)
    ys = np.maximum.accumulate(np.asarray(ys))
    return np.interp(np.arange(256), xs, ys).astype(np.float32)


def _normalize_photometric(target: np.ndarray, query: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Global photometric normalisation (colour matrix, then per-channel tone curve) so
    brightness/contrast/gamma/saturation edits don't count as differences. Both maps are global,
    so they cannot absorb spatial (content) changes."""
    valid = mask > 0
    if valid.sum() < MIN_VALID_PIXELS:
        return query
    t_vals = target[valid]
    q_vals = query[valid]
    idx = np.random.default_rng(42).choice(len(t_vals), min(PHOTOMETRIC_SAMPLES * 5, len(t_vals)), replace=False)
    t_s, q_s = t_vals[idx].astype(np.float32), q_vals[idx].astype(np.float32)

    # 1. Global 3x3 colour matrix + bias (saturation, hue, white balance, channel gains)
    A = np.hstack([q_s, np.ones((len(q_s), 1), np.float32)])
    M = np.linalg.lstsq(A, t_s, rcond=None)[0]  # (4, 3)
    mixed = lambda px: np.clip(px.astype(np.float32).reshape(-1, 3) @ M[:3] + M[3], 0, 255)  # noqa: E731
    query_m = mixed(query).reshape(query.shape).astype(np.uint8)
    q_m = mixed(q_vals[idx])

    # 2. Per-channel monotone tone curve for what is left (clipping, gamma, contrast)
    out = np.zeros(query.shape, dtype=np.uint8)
    for c in range(3):
        curve = _tone_curve(q_m[:, c], t_s[:, c])
        out[:, :, c] = np.clip(curve[query_m[:, :, c]], 0, 255).astype(np.uint8)
    return out


def _is_grayscale(rgb: np.ndarray, mask: np.ndarray) -> bool:
    """True if the masked pixels have (almost) no chroma: channels differ by < 2 levels on average."""
    px = rgb[mask].astype(np.int16)
    if len(px) == 0:
        return False
    chroma = np.abs(px[:, 0] - px[:, 1]) + np.abs(px[:, 1] - px[:, 2])
    return bool(chroma.mean() < 2.0)


def _compute_ssim(img1: np.ndarray, img2: np.ndarray, mask: np.ndarray) -> float:
    """Mean SSIM over the valid pixels (grayscale, 11x11 Gaussian window)."""
    C1, C2 = 6.5025, 58.5225
    a, b = img1.astype(np.float32), img2.astype(np.float32)
    blur = lambda x: cv2.GaussianBlur(x, (11, 11), 1.5)  # noqa: E731
    mu1, mu2 = blur(a), blur(b)
    s1 = blur(a * a) - mu1 * mu1
    s2 = blur(b * b) - mu2 * mu2
    s12 = blur(a * b) - mu1 * mu2
    ssim_map = ((2 * mu1 * mu2 + C1) * (2 * s12 + C2)) / ((mu1 ** 2 + mu2 ** 2 + C1) * (s1 + s2 + C2))
    valid = ssim_map[mask > 0]
    return float(valid.mean()) if len(valid) else 0.0


def _edge_magnitude(gray: np.ndarray, sigma: float) -> np.ndarray:
    blurred = cv2.GaussianBlur(gray.astype(np.float32), (0, 0), sigmaX=sigma)
    return np.hypot(cv2.Sobel(blurred, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(blurred, cv2.CV_32F, 0, 1, ksize=3))


def _compute_edge_corr(gray1: np.ndarray, gray2: np.ndarray, mask: np.ndarray, sigma: float) -> float:
    e1 = _edge_magnitude(gray1, sigma)[mask > 0]
    e2 = _edge_magnitude(gray2, sigma)[mask > 0]
    if len(e1) < MIN_VALID_PIXELS or e1.std() == 0 or e2.std() == 0:
        return 0.0
    c = np.corrcoef(e1, e2)[0, 1]
    return float(c) if np.isfinite(c) else 0.0


def _masked_corr(a: np.ndarray, b: np.ndarray, mask: np.ndarray) -> float:
    av, bv = a[mask > 0].astype(np.float32), b[mask > 0].astype(np.float32)
    if len(av) < MIN_VALID_PIXELS or av.std() == 0 or bv.std() == 0:
        return -1.0
    c = np.corrcoef(av, bv)[0, 1]
    return float(c) if np.isfinite(c) else -1.0


def _ecc_refine(target_gray, warped_rgb, mask_u8):
    """Nudge the alignment with an affine ECC fit. Returns (rgb, mask, applied, correlation).

    findTransformECC returns the warp W with template(x) ~ input(W(x)); aligning the input to the
    template therefore needs WARP_INVERSE_MAP.
    """
    sc = settings.ecc_downscale
    th, tw = target_gray.shape
    small = (max(8, int(tw * sc)), max(8, int(th * sc)))
    warped_gray = cv2.cvtColor(warped_rgb, cv2.COLOR_RGB2GRAY)
    t_s = cv2.resize(target_gray, small, interpolation=cv2.INTER_AREA)
    w_s = cv2.resize(warped_gray, small, interpolation=cv2.INTER_AREA)
    m_s = cv2.resize(mask_u8, small, interpolation=cv2.INTER_NEAREST)

    cc_pre = _masked_corr(t_s, w_s, m_s)
    warp = np.eye(2, 3, dtype=np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 100, 1e-5)
    try:
        cc_post, warp = cv2.findTransformECC(t_s, w_s, warp, cv2.MOTION_AFFINE, criteria, m_s, 5)
    except cv2.error:
        return warped_rgb, mask_u8, False, cc_pre

    warp = warp.copy()
    warp[:, 2] /= sc  # translation back to the working frame
    near_identity = (np.abs(warp[:, :2] - np.eye(2)).max() <= ECC_MAX_LINEAR_DEV
                     and np.abs(warp[:, 2]).max() <= ECC_MAX_SHIFT_PX)
    if not (cc_post > cc_pre and near_identity):
        return warped_rgb, mask_u8, False, cc_pre

    flags = cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP
    refined = cv2.warpAffine(warped_rgb, warp, (tw, th), flags=flags)
    refined_mask = cv2.warpAffine(mask_u8, warp, (tw, th), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP)
    return refined, refined_mask, True, float(cc_post)


def compute_dense_evidence(target_img: Image.Image, query_img: Image.Image, verify_result: VerifyResult) -> DenseResult:
    """Dense evidence for a geometrically credible candidate."""
    cv2.setRNGSeed(42)

    t_work = _to_work(target_img)
    q_work = _to_work(query_img, flip=verify_result.flipped)
    th, tw = t_work.shape[:2]

    warped = cv2.warpPerspective(q_work, verify_result.homography, (tw, th))
    mask = cv2.warpPerspective(np.full(q_work.shape[:2], 255, np.uint8), verify_result.homography, (tw, th),
                               flags=cv2.INTER_NEAREST)
    mask = cv2.erode(mask, np.ones((5, 5), np.uint8))

    t_gray = cv2.cvtColor(t_work, cv2.COLOR_RGB2GRAY)
    warped, mask, ecc_applied, ecc_corr = _ecc_refine(t_gray, warped, mask)
    valid = mask > 0

    if valid.sum() < MIN_VALID_PIXELS:
        zero = np.zeros((th, tw), np.uint8)
        return DenseResult(False, ecc_corr, True, 255.0, 255.0, 0.0, 0.0, 0.0, 999.0, 999.0, 1.0,
                           zero, t_work, q_work, warped, valid)

    # Clipped (saturated) query pixels carry no information about the original's values, so a
    # brightness/contrast edit would otherwise show up as a difference there. Leave them out of
    # the photometric fit and the statistics, unless that would discard most of the overlap.
    saturated = (warped >= SATURATION_HI).any(axis=2) | (warped <= SATURATION_LO).any(axis=2)
    stat_mask = mask.copy()
    stat_mask[saturated] = 0
    if (stat_mask > 0).sum() < SATURATION_MIN_KEEP * valid.sum():
        stat_mask = mask
    stat = stat_mask > 0

    # A query without colour (a grayscale copy) can only be compared on luminance: three equal
    # channels cannot be mapped back to a colour original, and colour would show as "difference".
    chroma_compared = not _is_grayscale(warped, stat)
    reference = t_work if chroma_compared else np.repeat(t_gray[..., None], 3, axis=2)

    adjusted = _normalize_photometric(reference, warped, stat_mask)
    residual = np.abs(reference.astype(np.float32) - adjusted.astype(np.float32))
    res_vals = residual[stat]

    a_gray = cv2.cvtColor(adjusted, cv2.COLOR_RGB2GRAY)
    flow = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM).calc(t_gray, a_gray, None)
    mag = np.hypot(flow[..., 0], flow[..., 1])[stat]

    return DenseResult(
        ecc_applied=ecc_applied,
        ecc_correlation=ecc_corr,
        chroma_compared=chroma_compared,
        residual_median=float(np.median(res_vals)),
        residual_p90=float(np.percentile(res_vals, 90)),
        ssim=_compute_ssim(t_gray, a_gray, stat_mask),
        edge_corr_fine=_compute_edge_corr(t_gray, a_gray, stat_mask, 1.0),
        edge_corr_coarse=_compute_edge_corr(t_gray, a_gray, stat_mask, 3.0),
        flow_median_px=float(np.median(mag)),
        flow_p90_px=float(np.percentile(mag, 90)),
        flow_frac_over_1px=float((mag > 1.0).mean()),
        residual_image=residual.mean(axis=2).astype(np.uint8),
        target_work=t_work,
        query_work=q_work,
        warped_work=adjusted,
        valid_mask=valid,
    )
