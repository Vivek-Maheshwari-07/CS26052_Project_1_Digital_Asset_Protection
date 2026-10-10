"""G5: Evidence images (aligned overlay, residual heatmap, changed-region mask, match lines).

Files are written under <upload dir>/evidence/<check_id>/ so the existing /uploads mount serves them;
returned paths are relative to the upload dir (use storage.image_url to turn them into URLs).
"""
import logging
import re
from pathlib import Path

import cv2
import numpy as np

from app import storage
from app.gate.dense import DenseResult
from app.gate.settings import settings
from app.gate.verify import VerifyResult

logger = logging.getLogger(__name__)

_SAFE_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
CHANGE_THRESHOLD = 40  # gray levels of residual treated as a changed pixel


def evidence_root() -> Path:
    return Path(storage.upload_dir()) / "evidence"


def secure_check_dir(check_id: str) -> Path:
    """Validate check_id (no traversal) and return its evidence directory."""
    if not _SAFE_ID.match(check_id or ""):
        raise ValueError("Invalid check ID for evidence path.")
    root = evidence_root().resolve()
    out_dir = (root / check_id).resolve()
    if root not in out_dir.parents:
        raise ValueError("Path traversal attempted in evidence generation.")
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir


def _cap_size(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    if max(h, w) <= settings.evidence_max_side:
        return img
    scale = settings.evidence_max_side / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _write_jpeg(path: Path, rgb: np.ndarray) -> None:
    ok, buf = cv2.imencode(".jpg", cv2.cvtColor(_cap_size(rgb), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 88])
    if not ok:
        raise RuntimeError(f"Could not encode {path.name}")
    path.write_bytes(buf.tobytes())


def generate_evidence(check_id: str, dense: DenseResult, verify: VerifyResult) -> dict:
    """Write the evidence images for one candidate. Returns {name: path relative to the upload dir}."""
    out_dir = secure_check_dir(check_id)
    rel_dir = f"evidence/{out_dir.name}"
    target, warped, valid = dense.target_work, dense.warped_work, dense.valid_mask
    paths = {}

    # 1. 50/50 overlay of the aligned query on the original
    _write_jpeg(out_dir / "overlay.jpg", cv2.addWeighted(target, 0.5, warped, 0.5, 0))
    paths["overlay"] = f"{rel_dir}/overlay.jpg"

    # 2. Residual heatmap (stretched so small differences are visible)
    stretched = np.clip(dense.residual_image.astype(np.float32) * 4, 0, 255).astype(np.uint8)
    heat = cv2.cvtColor(cv2.applyColorMap(stretched, cv2.COLORMAP_JET), cv2.COLOR_BGR2RGB)
    heat[~valid] = 0
    _write_jpeg(out_dir / "heatmap.jpg", cv2.addWeighted(target, 0.3, heat, 0.7, 0))
    paths["heatmap"] = f"{rel_dir}/heatmap.jpg"

    # 3. Changed-region mask: where the aligned query still differs strongly from the original
    changed = ((dense.residual_image > CHANGE_THRESHOLD) & valid).astype(np.uint8) * 255
    changed = cv2.morphologyEx(changed, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    changed = cv2.dilate(changed, np.ones((9, 9), np.uint8))
    tint = target.copy()
    tint[changed > 0] = (0.5 * tint[changed > 0] + 0.5 * np.array([255, 40, 40])).astype(np.uint8)
    _write_jpeg(out_dir / "changes.jpg", tint)
    paths["changes"] = f"{rel_dir}/changes.jpg"

    # 4. Match lines between the query and the original (seeded so output is reproducible)
    n = min(80, len(verify.q_inliers))
    rng = np.random.default_rng(42)
    idx = rng.choice(len(verify.q_inliers), n, replace=False) if len(verify.q_inliers) > n else np.arange(len(verify.q_inliers))
    kq = [cv2.KeyPoint(float(p[0]), float(p[1]), 5) for p in verify.q_inliers[idx]]
    kt = [cv2.KeyPoint(float(p[0]), float(p[1]), 5) for p in verify.t_inliers[idx]]
    matches = [cv2.DMatch(i, i, 0) for i in range(n)]
    lines = cv2.drawMatches(dense.query_work, kq, target, kt, matches, None,
                            flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
    _write_jpeg(out_dir / "matches.jpg", lines)
    paths["matches"] = f"{rel_dir}/matches.jpg"

    return paths
