"""G4: PURE classification logic."""
import logging
from dataclasses import dataclass
from typing import Literal, Optional

from app.gate.settings import settings

logger = logging.getLogger(__name__)

Grade = Literal["TIER1", "TIER2", "TIER3", "RELATED_DIFFERENT_CAPTURE", "NONE"]

# Credible-geometry grades from strongest to weakest. A candidate whose natural grade is not
# `active` is reported under the next weaker grade that is, so a shadow tier never hides a
# candidate that should at least surface as a lead.
_CHAIN = ("TIER1", "TIER2", "RELATED_DIFFERENT_CAPTURE")


@dataclass
class ClassificationResult:
    grade: Grade  # what the metrics say (always logged)
    active_grade: Grade  # what the user is told, given each component's mode
    reason: str


def _mode_of(grade: str) -> str:
    return {
        "TIER1": settings.modes.tier1,
        "TIER2": settings.modes.tier2,
        "RELATED_DIFFERENT_CAPTURE": settings.modes.related,
        "TIER3": settings.modes.tier3,
    }[grade]


def _active_from(grade: Grade) -> Grade:
    if grade == "TIER3":
        return "TIER3" if settings.modes.tier3 == "active" else "NONE"
    for g in _CHAIN[_CHAIN.index(grade):]:
        if _mode_of(g) == "active":
            return g  # type: ignore[return-value]
    return "NONE"


def classify_candidate(
    credible: bool,
    lead_score: float,
    lead_margin: float,
    residual_p90: Optional[float],
    flow_median: Optional[float],
    edge_corr: Optional[float],
) -> ClassificationResult:
    """Pure function mapping metrics to a classification grade."""
    if not credible:
        if lead_score >= settings.tier3_lead_score_min and lead_margin >= settings.tier3_margin_min:
            return ClassificationResult("TIER3", _active_from("TIER3"), "High lead score but no credible geometry.")
        return ClassificationResult("NONE", "NONE", "No credible geometry and low embedding score.")

    if residual_p90 is None or flow_median is None or edge_corr is None:
        return ClassificationResult("NONE", "NONE", "Missing dense metrics for credible candidate.")

    if residual_p90 <= settings.tier1_residual_p90_max and flow_median <= settings.tier1_flow_median_max_px:
        return ClassificationResult("TIER1", _active_from("TIER1"), "Low residual and optical flow.")

    if flow_median <= settings.tier2_flow_median_max_px and edge_corr >= settings.tier2_edge_corr_min:
        return ClassificationResult("TIER2", _active_from("TIER2"), "High edge correlation and moderate flow.")

    return ClassificationResult(
        "RELATED_DIFFERENT_CAPTURE", _active_from("RELATED_DIFFERENT_CAPTURE"),
        "Credible geometry but fails Tier 1/2 dense evidence (likely a different photograph of the same scene).",
    )
