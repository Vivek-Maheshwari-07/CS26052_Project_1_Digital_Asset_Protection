"""Settings for the gate pipeline."""
import hashlib
import json
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel

GateMode = Literal["off", "shadow", "active", "stub"]


class GateModes(BaseModel):
    """Execution modes for gate components."""
    tier1: GateMode
    related: GateMode
    tier2: GateMode
    tier3: GateMode
    ml_detector: GateMode
    c2pa: GateMode
    watermark: GateMode


class GateSettings(BaseModel):
    """Typed settings loaded from config.yaml."""
    version: str
    modes: GateModes

    sift_nfeatures: int
    working_long_side: int
    ratio_test: float
    ransac_reproj_px: float
    min_inliers: int
    min_inlier_coverage: float
    min_spread_cells: int
    reproj_tight_px: float
    min_tight_inlier_frac: float
    tier1_flow_median_max_px: float
    tier1_residual_p90_max: float
    tier2_flow_median_max_px: float
    tier2_edge_corr_min: float
    tier3_lead_score_min: float
    tier3_margin_min: float
    k_candidates: int
    ecc_downscale: float
    evidence_max_side: int
    uniform_std_max: float
    uniform_light_min: float
    uniform_dark_max: float


def load_settings() -> tuple[GateSettings, str, str]:
    """Load settings from config.yaml and return (settings, hash, raw_json)."""
    config_path = Path(__file__).parent / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        raw_dict = yaml.safe_load(f)
    settings = GateSettings(**raw_dict)
    canonical = json.dumps(raw_dict, sort_keys=True)
    settings_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return settings, settings_hash, canonical


settings, config_hash, config_snapshot = load_settings()
