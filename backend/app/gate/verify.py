"""G2: Geometric Verification (SIFT + MAGSAC + repeated-pattern guard)."""
import logging
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
FEATURE_VERSION = f"sift{settings.sift_nfeatures}-w{settings.working_long_side}-trim1"

# Bounds for a plausible copy transform (query working coords -> target working coords).
MIN_SCALE, MAX_SCALE = 0.05, 20.0
MAX_PERSPECTIVE = 1e-3


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
    flipped: bool
    homography: Optional[np.ndarray] = None  # query working coords -> target working coords
    q_inliers: Optional[np.ndarray] = None  # query working coords (of the mirrored query if flipped)
    t_inliers: Optional[np.ndarray] = None  # target working coords
    raw_matches: Optional[List[cv2.DMatch]] = None
    tight_inlier_frac: float = 0.0


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


def get_cached_features(work_id: str, pipeline_version: str, image: Optional[Image.Image] = None) -> tuple[np.ndarray, np.ndarray]:
    """Load, or compute and cache, a work's SIFT features (the cache also records the image size)."""
    cache_path = cache_dir() / f"{work_id}_{pipeline_version}.npz"
    if cache_path.exists():
        data = np.load(cache_path)
        return data["kps"], data["descs"]

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


def verify_geometry(query_img: Image.Image, target_kps: np.ndarray, target_descs: np.ndarray, target_w: int, target_h: int) -> VerifyResult:
    """Verify that the query is a geometric transform of the target, trying the mirrored query too."""
    cv2.setRNGSeed(42)
    np.random.seed(42)

    w_q, h_q = query_img.size
    s_q = working_scale(w_q, h_q)
    w_q_work, h_q_work = int(w_q * s_q), int(h_q * s_q)
    s_t = working_scale(target_w, target_h)
    target_w_work, target_h_work = int(target_w * s_t), int(target_h * s_t)

    def fail(reason, flipped, n=0, cov_q=0.0, cov_t=0.0):
        return VerifyResult(False, reason, n, cov_q, cov_t, 0.0, 0.0, 0.0, flipped)

    def attempt(k_q, d_q, flipped: bool) -> VerifyResult:
        matches = match_features(d_q, target_descs)
        if len(matches) < settings.min_inliers:
            return fail("not_enough_matches", flipped, len(matches))

        pts_q = np.array([k_q[m.queryIdx] for m in matches], dtype=np.float32)
        pts_t = np.array([target_kps[m.trainIdx] for m in matches], dtype=np.float32)

        H, mask = cv2.findHomography(pts_q, pts_t, cv2.USAC_MAGSAC, settings.ransac_reproj_px)
        if H is None or mask is None:
            return fail("homography_failed", flipped)

        mask_bool = mask.ravel().astype(bool)
        inliers_q, inliers_t = pts_q[mask_bool], pts_t[mask_bool]
        n_inliers = len(inliers_q)
        if n_inliers < settings.min_inliers:
            return fail("not_enough_inliers", flipped, n_inliers)

        cov_q, spread_q = compute_coverage_and_spread(inliers_q, w_q_work, h_q_work)
        cov_t, spread_t = compute_coverage_and_spread(inliers_t, target_w_work, target_h_work)

        # A crop only populates part of the *other* image's grid, so one side being
        # widely spread is enough; clustering on both sides is the repeated-pattern signature.
        if max(spread_q, spread_t) < settings.min_spread_cells:
            return fail("insufficient_spread", flipped, n_inliers, cov_q, cov_t)
        if cov_q < settings.min_inlier_coverage or cov_t < settings.min_inlier_coverage:
            return fail("insufficient_coverage", flipped, n_inliers, cov_q, cov_t)

        tight = reprojection_consistency(H, inliers_q, inliers_t)
        if tight < settings.min_tight_inlier_frac:
            res = fail("inconsistent_matches", flipped, n_inliers, cov_q, cov_t)
            res.tight_inlier_frac = tight
            return res

        scale, rot, persp = decompose_homography(H)
        if not (MIN_SCALE < scale < MAX_SCALE) or persp > MAX_PERSPECTIVE:
            res = fail("implausible_transform", flipped, n_inliers, cov_q, cov_t)
            res.tight_inlier_frac = tight
            return res

        return VerifyResult(True, "credible", n_inliers, cov_q, cov_t, scale, rot, persp, flipped,
                            H, inliers_q, inliers_t, matches, tight)

    kps_q, descs_q = extract_features(query_img)
    res_normal = attempt(kps_q, descs_q, False)

    kps_f, descs_f = extract_features(ImageOps.mirror(query_img))
    res_flipped = attempt(kps_f, descs_f, True)

    if res_normal.credible != res_flipped.credible:
        return res_normal if res_normal.credible else res_flipped
    return res_normal if res_normal.inlier_count >= res_flipped.inlier_count else res_flipped
