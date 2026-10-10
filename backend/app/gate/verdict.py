"""Verdict typed models."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict

# What each classification is allowed to be called. Only evidence-grade claims may be presented
# as proof of derivation; lead-grade claims always need a human to look at the images.
CLAIM_GRADE = {
    "TIER1": "evidence",
    "TIER2": "evidence",
    "TIER3": "lead",
    "RELATED_DIFFERENT_CAPTURE": "lead",
}


class Claim(BaseModel):
    model_config = ConfigDict(frozen=True)
    classification: str
    grade: str  # "evidence" or "lead"
    candidate_work_id: str
    statement: str
    human_review_required: bool = False


class CandidateResult(BaseModel):
    model_config = ConfigDict(frozen=True)
    work_id: str
    classification: str
    metrics: Dict[str, Any]
    error_reason: Optional[str] = None


class Timings(BaseModel):
    model_config = ConfigDict(frozen=True)
    g0_normalize: float = 0.0
    g1_retrieve: float = 0.0
    g2_verify: float = 0.0
    g3_dense: float = 0.0
    g4_classify: float = 0.0
    g5_evidence: float = 0.0
    total: float = 0.0


class Verdict(BaseModel):
    model_config = ConfigDict(frozen=True)
    schema_version: str = "1.1.0"
    check_id: str
    claims: List[Claim]
    candidates: List[CandidateResult]
    metrics: Dict[str, Any]
    shadow: Dict[str, Any]
    origin: Dict[str, Any]
    evidence_paths: Dict[str, str]
    evidence_work_id: Optional[str] = None  # the candidate the evidence images belong to
    timings: Timings
    pipeline_version: str
    config_hash: str
    config_snapshot: str
    warnings: List[str] = []  # stage failures that did not stop the run (never silent)


def build_statement(classification: str) -> str:
    """Plain-language statement for a classification. No claim stronger than its grade."""
    if classification == "TIER1":
        return ("The aligned images match pixel for pixel in the regions that were not changed "
                "(residual and optical flow within limits). This is reproducible pixel evidence of derivation.")
    if classification == "TIER2":
        return ("The images align geometrically and their edge structure matches, but pixels differ locally. "
                "This is consistent with an edited or re-rendered derivative; review the evidence images.")
    if classification in ("TIER3", "RELATED_DIFFERENT_CAPTURE"):
        return ("Similar content was found, but derivation is not proven. It may be a different photograph "
                "of the same scene. Human review is required; this is a lead, not proof.")
    return "No match found."
