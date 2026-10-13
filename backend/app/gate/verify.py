"""G2: Geometric Verification (SIFT + MAGSAC + repeated-pattern guard)."""
import logging
import threading
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
from PIL import Image, ImageOps

from app import storage
from app.gate.settings import settings

logger = logging.getLogger(__name__)

# Names the SIFT cache; changes whenever the settings that shape the features change.
FEATURE_VERSION = f"sift{settings.sift_nfeatures}-w{settings.working_long_side}-trim1-alphaW"

# Bounds for a plausible copy transform (query working coords -> target working coords).
MIN_SCALE, MAX_SCALE = 0.05, 20.0
MAX_PERSPECTIVE = 1e-3

# Query orientations tried against every target: as-is and mirrored left-right. SIFT is rotation
# invariant, so rotations by any angle and a top-bottom flip (= mirror + 180 degrees) need no extra attempt.
FLIP_MODES = ("", "h")


def apply_flip(img: Image.Image, mode: str) -> Image.Image:
    if mode == "h":
        return ImageOps.mirror(img)
    if mode == "v":
        return ImageOps.flip(img)
    return img


def cache_dir() -> Path:
    """SIFT feature cache, under the configured upload dir (created on demand, never at import)."""
    path = Path(storage.upload_dir()) / "sift_cache"
    path.mkdir(parents=True, exist_ok=True)
    return path


@dataclass
class VerifyResult:
    credible: bool
    reason: str
    inlier_count: int
    inlier_coverage_q: float
    inlier_coverage_t: float
    scale: float
    rotation: float
    perspective: float
    flip: str  # "", "h" or "v": which orientation of the query matched
    homography: Optional[np.ndarray] = None  # query working coords -> target working coords
    q_inliers: Optional[np.ndarray] = None  # query working coords (of the flipped query if flip)
    t_inliers: Optional[np.ndarray] = None  # target working coords
    raw_matches: Optional[List[cv2.DMatch]] = None
    tight_inlier_frac: float = 0.0
    low_feature: bool = False  # few keypoints (flat art): relaxed counts, stricter fit
    method: str = "sift"  # "sift", or "ecc" for the whole-image fallback (then tight_inlier_frac holds the ECC correlation)
    q_size: Optional[tuple] = None  # (w, h) of the query's working frame (q_inliers live in it)
    t_size: Optional[tuple] = None  # (w, h) of the target's working frame

    @property
    def flipped(self) -> bool:
        return bool(self.flip)


def working_scale(w: int, h: int) -> float:
    """Factor by which an image of this size is shrunk to the working resolution (never enlarged)."""
    return min(1.0, settings.working_long_side / max(w, h, 1))


def _resize_long_side(img_arr: np.ndarray, long_side: int) -> tuple[np.ndarray, float]:
    h, w = img_arr.shape[:2]
    if max(h, w) <= long_side:
        return img_arr, 1.0
    scale = long_side / max(h, w)
    resized = cv2.resize(img_arr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return resized, scale


def extract_features(image: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    """SIFT on the working-resolution grayscale. Returns keypoints (N, 2) and descriptors (N, 128)."""
    cv2.setRNGSeed(42)

    img_cv = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
    resized, _ = _resize_long_side(img_cv, settings.working_long_side)

    sift = cv2.SIFT_create(nfeatures=settings.sift_nfeatures)
    kps, descs = sift.detectAndCompute(resized, None)

    if kps is None or len(kps) == 0 or descs is None:
        return np.zeros((0, 2), dtype=np.float32), np.zeros((0, 128), dtype=np.float32)

    pts = np.array([kp.pt for kp in kps], dtype=np.float32)
    return pts, descs


class QueryFeatures:
    """SIFT features of one query in each orientation, extracted lazily and at most once.

    Shared by every candidate of a check, so the (expensive) extraction does not repeat per candidate.
    """

    def __init__(self, image: Image.Image):
        self.image = image
        self._feats: dict[str, tuple[np.ndarray, np.ndarray]] = {}
        self._lock = threading.Lock()

    def get(self, mode: str = "") -> tuple[np.ndarray, np.ndarray]:
        with self._lock:
            if mode not in self._feats:
                self._feats[mode] = extract_features(apply_flip(self.image, mode))
            return self._feats[mode]


# Small in-memory LRU of target descriptors: np.load of a 2 MB .npz per candidate per check adds up.
_desc_cache: "OrderedDict[tuple, tuple[np.ndarray, np.ndarray]]" = OrderedDict()
_desc_lock = threading.Lock()


def _cache_get(key):
    with _desc_lock:
        if key in _desc_cache:
            _desc_cache.move_to_end(key)
            return _desc_cache[key]
    return None


def _cache_put(key, value):
    with _desc_lock:
        _desc_cache[key] = value
        _desc_cache.move_to_end(key)
        while len(_desc_cache) > max(1, settings.descriptor_cache_size):
            _desc_cache.popitem(last=False)


def get_cached_features(work_id: str, pipeline_version: str, image: Optional[Image.Image] = None) -> tuple[np.ndarray, np.ndarray]:
    """Load, or compute and cache, a work's SIFT features (the cache also records the image size)."""
    cache_path = cache_dir() / f"{work_id}_{pipeline_version}.npz"
    if cache_path.exists():
        key = (str(cache_path), cache_path.stat().st_mtime_ns)
        hit = _cache_get(key)
        if hit is not None:
            return hit
        data = np.load(cache_path)
        value = (data["kps"], data["descs"])
        _cache_put(key, value)
        return value

    if image is None:
        raise ValueError(f"Features not cached for {work_id} and no image provided to compute them.")

    kps, descs = extract_features(image)
    np.savez_compressed(cache_path, kps=kps, descs=descs, size=np.array(image.size, dtype=np.int32))
    return kps, descs


def get_cached_size(work_id: str, pipeline_version: str) -> Optional[tuple[int, int]]:
    """(width, height) of the image the cached features were computed from, if recorded."""
    cache_path = cache_dir() / f"{work_id}_{pipeline_version}.npz"
    if not cache_path.exists():
        return None
    data = np.load(cache_path)
    if "size" not in data.files:
        return None
    w, h = data["size"]
    return int(w), int(h)


def match_features(desc_q: np.ndarray, desc_t: np.ndarray) -> List[cv2.DMatch]:
    """Ratio-test matches that are also mutual nearest neighbours."""
    if len(desc_q) < 2 or len(desc_t) < 2:
        return []

    bf = cv2.BFMatcher(cv2.NORM_L2)

    def ratio_matches(a, b):
        out = {}
        for pair in bf.knnMatch(a, b, k=2):
            if len(pair) == 2 and pair[0].distance < settings.ratio_test * pair[1].distance:
                out[pair[0].queryIdx] = pair[0].trainIdx
        return out

    good_q2t = ratio_matches(desc_q, desc_t)
    good_t2q = ratio_matches(desc_t, desc_q)
    return [cv2.DMatch(q, t, 0.0) for q, t in good_q2t.items() if good_t2q.get(t) == q]


def compute_coverage_and_spread(pts: np.ndarray, w: int, h: int) -> tuple[float, int]:
    """Bounding-box area ratio of the points, and the number of populated cells of a 4x4 grid."""
    if len(pts) == 0 or w * h <= 0:
        return 0.0, 0

    min_x, min_y = pts.min(axis=0)
    max_x, max_y = pts.max(axis=0)
    coverage = max(0.0, float((max_x - min_x) * (max_y - min_y))) / (w * h)

    cells = {(min(3, max(0, int(4 * x / w))), min(3, max(0, int(4 * y / h)))) for x, y in pts}
    return coverage, len(cells)


def decompose_homography(H: np.ndarray) -> tuple[float, float, float]:
    """Scale, rotation (degrees) and perspective magnitude of a homography (normalised so H[2,2] = 1)."""
    if abs(H[2, 2]) > 1e-12:
        H = H / H[2, 2]
    A = H[0:2, 0:2]
    s = np.linalg.svd(A, compute_uv=False)
    scale = float(np.sqrt(s[0] * s[1]))
    rotation = float(np.degrees(np.arctan2(A[1, 0], A[0, 0])))
    perspective = float(np.linalg.norm(H[2, 0:2]))
    return scale, rotation, perspective


def reprojection_consistency(H: np.ndarray, pts_q: np.ndarray, pts_t: np.ndarray) -> float:
    """Fraction of the points that land within reproj_tight_px of their match under H.

    This is the repeated-pattern guard. A real copy is explained tightly by one
    transform (crops, resizes and rotations included); matches between repeated
    motifs (carpet, tiles) only fit loosely, so far fewer points are tight.
    """
    if len(pts_q) == 0:
        return 0.0
    proj = cv2.perspectiveTransform(pts_q.reshape(-1, 1, 2).astype(np.float64), H.astype(np.float64)).reshape(-1, 2)
    err = np.linalg.norm(proj - pts_t, axis=1)
    return float((err <= settings.reproj_tight_px).mean())


def _work_rgb(img: Image.Image) -> np.ndarray:
    arr = np.array(img.convert("RGB"))
    s = working_scale(arr.shape[1], arr.shape[0])
    if s < 1.0:
        arr = cv2.resize(arr, (int(arr.shape[1] * s), int(arr.shape[0] * s)), interpolation=cv2.INTER_AREA)
    return arr


def verify_whole_image_ecc(query_img: Image.Image, target_img: Image.Image) -> Optional[VerifyResult]:
    """Fallback for flat art that has too few keypoints for SIFT: align the whole query to the target
    with ECC (resize + recompress + recolour copies keep the framing), in both orientations.

    Only proposes an alignment; the dense stage must still show the pixels agree before any claim.
    Returns None when the aspect ratios differ (a crop needs keypoints) or nothing converges tightly.
    """
    if not settings.ecc_fallback:
        return None
    t_rgb = _work_rgb(target_img)
    th, tw = t_rgb.shape[:2]
    small_scale = min(1.0, 256 / max(tw, th))
    sw, sh = max(16, int(tw * small_scale)), max(16, int(th * small_scale))
    S_small = np.diag([sw / tw, sh / th, 1.0])

    def prep(rgb):
        g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        g = cv2.resize(g, (sw, sh), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
        return cv2.GaussianBlur(g, (0, 0), 1.0)

    g_t = prep(t_rgb)
    best = None
    for mode in FLIP_MODES:
        q_rgb = _work_rgb(apply_flip(query_img, mode))
        qh, qw = q_rgb.shape[:2]
        if abs((qw / qh) / (tw / th) - 1) > settings.ecc_fallback_max_aspect_diff:
            return None
        g_q = prep(cv2.resize(q_rgb, (tw, th), interpolation=cv2.INTER_AREA))
        warp = np.eye(2, 3, dtype=np.float32)
        try:
            cc, warp = cv2.findTransformECC(g_t, g_q, warp, cv2.MOTION_AFFINE,
                                            (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
        except cv2.error:
            continue
        near_identity = (np.abs(warp[:, :2] - np.eye(2)).max() <= 0.15
                         and (np.abs(warp[:, 2]) / np.array([sw, sh])).max() <= 0.1)
        if cc >= settings.ecc_fallback_min_cc and near_identity and (best is None or cc > best[0]):
            best = (float(cc), mode, warp.copy(), qw, qh)
    if best is None:
        return None

    cc, mode, warp, qw, qh = best
    W3 = np.vstack([warp, [0, 0, 1]]).astype(np.float64)
    S_resize = np.diag([tw / qw, th / qh, 1.0])
    H = np.linalg.inv(S_small) @ np.linalg.inv(W3) @ S_small @ S_resize
    scale, rot, persp = decompose_homography(H)
    empty = np.zeros((0, 2), dtype=np.float32)
    return VerifyResult(True, "ecc_fallback", 0, 1.0, 1.0, scale, rot, persp, mode, H, empty, empty, None,
                        cc, True, "ecc")


def _coverage_ok(cov_q: float, cov_t: float) -> bool:
    """Inliers must span a meaningful part of the images: both of them, or - for a crop or an
    embedded copy - one image almost entirely (a shared logo or stamp spans neither)."""
    if cov_q >= settings.min_inlier_coverage and cov_t >= settings.min_inlier_coverage:
        return True
    return (max(cov_q, cov_t) >= settings.containment_coverage
            and min(cov_q, cov_t) >= settings.containment_min_coverage)


def verify_geometry(query_img: Image.Image, target_kps: np.ndarray, target_descs: np.ndarray,
                    target_w: int, target_h: int, qfeats: Optional[QueryFeatures] = None) -> VerifyResult:
    """Verify that the query is a geometric transform of the target, trying mirrored/flipped queries too.

    Pass a shared `qfeats` when verifying the same query against several targets.
    """
    cv2.setRNGSeed(42)
    np.random.seed(42)
    qfeats = qfeats or QueryFeatures(query_img)

    w_q, h_q = query_img.size
    s_q = working_scale(w_q, h_q)
    w_q_work, h_q_work = int(w_q * s_q), int(h_q * s_q)
    s_t = working_scale(target_w, target_h)
    target_w_work, target_h_work = int(target_w * s_t), int(target_h * s_t)

    def fail(reason, flip, n=0, cov_q=0.0, cov_t=0.0, low=False):
        return VerifyResult(False, reason, n, cov_q, cov_t, 0.0, 0.0, 0.0, flip, low_feature=low)

    def attempt(k_q, d_q, flip: str) -> VerifyResult:
        low = min(len(k_q), len(target_kps)) < settings.low_feature_kps
        min_inliers = settings.low_feature_min_inliers if low else settings.min_inliers
        min_cells = settings.low_feature_min_spread_cells if low else settings.min_spread_cells
        min_tight = settings.low_feature_min_tight_frac if low else settings.min_tight_inlier_frac

        matches = match_features(d_q, target_descs)
        if len(matches) < min_inliers:
            return fail("not_enough_matches", flip, len(matches), low=low)

        pts_q = np.array([k_q[m.queryIdx] for m in matches], dtype=np.float32)
        pts_t = np.array([target_kps[m.trainIdx] for m in matches], dtype=np.float32)

        H, mask = cv2.findHomography(pts_q, pts_t, cv2.USAC_MAGSAC, settings.ransac_reproj_px)
        if H is None or mask is None:
            return fail("homography_failed", flip, low=low)

        mask_bool = mask.ravel().astype(bool)
        inliers_q, inliers_t = pts_q[mask_bool], pts_t[mask_bool]
        n_inliers = len(inliers_q)
        if n_inliers < min_inliers:
            return fail("not_enough_inliers", flip, n_inliers, low=low)

        cov_q, spread_q = compute_coverage_and_spread(inliers_q, w_q_work, h_q_work)
        cov_t, spread_t = compute_coverage_and_spread(inliers_t, target_w_work, target_h_work)

        # A crop only populates part of the *other* image's grid, so one side being
        # widely spread is enough; clustering on both sides is the repeated-pattern signature.
        if max(spread_q, spread_t) < min_cells:
            return fail("insufficient_spread", flip, n_inliers, cov_q, cov_t, low)
        if not _coverage_ok(cov_q, cov_t):
            return fail("insufficient_coverage", flip, n_inliers, cov_q, cov_t, low)

        tight = reprojection_consistency(H, inliers_q, inliers_t)
        if tight < min_tight:
            res = fail("inconsistent_matches", flip, n_inliers, cov_q, cov_t, low)
            res.tight_inlier_frac = tight
            return res

        scale, rot, persp = decompose_homography(H)
        if not (MIN_SCALE < scale < MAX_SCALE) or persp > MAX_PERSPECTIVE:
            res = fail("implausible_transform", flip, n_inliers, cov_q, cov_t, low)
            res.tight_inlier_frac = tight
            return res

        res = VerifyResult(True, "credible", n_inliers, cov_q, cov_t, scale, rot, persp, flip,
                           H, inliers_q, inliers_t, matches, tight, low)
        res.q_size, res.t_size = (w_q_work, h_q_work), (target_w_work, target_h_work)
        return res

    best: Optional[VerifyResult] = None
    for mode in FLIP_MODES:
        k_q, d_q = qfeats.get(mode)
        res = attempt(k_q, d_q, mode)
        if best is None or (res.credible, res.inlier_count) > (best.credible, best.inlier_count):
            best = res
        # A strong, tight match settles it: don't spend time on the other orientations.
        if res.credible and res.inlier_count >= 6 * settings.min_inliers and res.tight_inlier_frac >= 0.9:
            break
    assert best is not None
    return best
