"""The gate pipeline entry point: G0 normalise -> G1 retrieve -> G2 verify -> G3 dense -> G4 classify
-> G5 evidence, plus the origin module in parallel."""
import asyncio
import logging
import time
import uuid
from typing import Any, List, Optional

from app.gate.classify import classify_candidate
from app.gate.dense import compute_dense_evidence
from app.gate.evidence import generate_evidence
from app.gate.features import load_target
from app.gate.normalize import InvalidImageError, normalize_image
from app.gate.origin import check_origin
from app.gate.retrieve import retrieve
from app.gate.settings import config_hash, config_snapshot, settings
from app.gate.verdict import CLAIM_GRADE, CandidateResult, Claim, Timings, Verdict, build_statement
from app.gate.verify import FEATURE_VERSION, get_cached_features, get_cached_size, verify_geometry

logger = logging.getLogger(__name__)
PIPELINE_VERSION = settings.version

# Candidates are ranked best-first by their natural grade, then by inlier support.
_RANK = {"TIER1": 3, "TIER2": 2, "RELATED_DIFFERENT_CAPTURE": 1}


async def run_gate(suspect_bytes: bytes, db: Any, check_id: Optional[str] = None, with_evidence: bool = True) -> Verdict:
    """Run the full detection pipeline. Raises InvalidImageError only for undecodable input;
    any stage failure is logged and recorded in `verdict.warnings` instead of being swallowed.
    `with_evidence=False` skips writing the G5 images (used at registration time)."""
    check_id = check_id or str(uuid.uuid4())
    t_start = time.monotonic()
    timings = {}
    warnings: List[str] = []

    # G0: normalise
    t0 = time.monotonic()
    try:
        norm_img, _crop_box, _uniform = normalize_image(suspect_bytes)
    except InvalidImageError:
        raise
    except Exception as e:
        logger.exception("Unexpected error in G0 normalize.")
        raise InvalidImageError("Failed to normalize image.") from e
    timings["g0_normalize"] = time.monotonic() - t0

    # G1: retrieve
    t1 = time.monotonic()
    try:
        candidates, lead_score = await retrieve(norm_img, db)
    except Exception as e:
        logger.exception("Unexpected error in G1 retrieve.")
        warnings.append(f"retrieval failed: {type(e).__name__}: {e}")
        candidates, lead_score = [], 0.0
    timings["g1_retrieve"] = time.monotonic() - t1

    candidate_results: List[CandidateResult] = []
    claims: List[Claim] = []
    shadow_metrics = {}
    best = None  # (rank key, work_id, v_res, d_res)
    t2_sum = t3_sum = t4_sum = 0.0

    for cand in candidates:
        try:
            t2 = time.monotonic()
            doc = await db.works.find_one({"id": cand.work_id}, {"width": 1, "height": 1, "image_path": 1})
            if not doc:
                candidate_results.append(CandidateResult(work_id=cand.work_id, classification="NONE", metrics={},
                                                         error_reason="Work not found."))
                continue

            try:
                target_kps, target_descs = get_cached_features(cand.work_id, FEATURE_VERSION)
            except ValueError:
                warnings.append(f"features missing for {cand.work_id}; run the gate backfill")
                candidate_results.append(CandidateResult(work_id=cand.work_id, classification="NONE", metrics={},
                                                         error_reason="Target features not cached."))
                continue
            size = get_cached_size(cand.work_id, FEATURE_VERSION) or (doc.get("width") or 1024, doc.get("height") or 1024)

            v_res = await asyncio.to_thread(verify_geometry, norm_img, target_kps, target_descs, size[0], size[1])
            t2_sum += time.monotonic() - t2

            # G3: dense evidence, only for geometrically credible candidates
            t3 = time.monotonic()
            d_res = None
            if v_res.credible:
                target_img = await asyncio.to_thread(load_target, doc.get("image_path"))
                if target_img is None:
                    warnings.append(f"target image for {cand.work_id} could not be loaded")
                else:
                    d_res = await asyncio.to_thread(compute_dense_evidence, target_img, norm_img, v_res)
            t3_sum += time.monotonic() - t3

            # G4: classify
            t4 = time.monotonic()
            c_res = classify_candidate(
                credible=v_res.credible,
                lead_score=cand.lead_score,
                lead_margin=cand.lead_margin,
                residual_p90=d_res.residual_p90 if d_res else None,
                flow_median=d_res.flow_median_px if d_res else None,
                edge_corr=d_res.edge_corr_fine if d_res else None,
            )
            t4_sum += time.monotonic() - t4

            metrics = {
                "clip_sim": cand.clip_sim,
                "dino_sim": cand.dino_sim,
                "inlier_count": v_res.inlier_count,
                "inlier_coverage_q": v_res.inlier_coverage_q,
                "inlier_coverage_t": v_res.inlier_coverage_t,
                "tight_inlier_frac": v_res.tight_inlier_frac,
                "flipped": v_res.flipped,
                "credible": v_res.credible,
                "verify_reason": v_res.reason,
            }
            if d_res:
                metrics.update({
                    "residual_p90": d_res.residual_p90,
                    "flow_median_px": d_res.flow_median_px,
                    "edge_corr_fine": d_res.edge_corr_fine,
                    "ssim": d_res.ssim,
                    "ecc_applied": d_res.ecc_applied,
                    "chroma_compared": d_res.chroma_compared,
                })

            if c_res.active_grade != "NONE":
                claims.append(Claim(
                    classification=c_res.active_grade,
                    grade=CLAIM_GRADE[c_res.active_grade],
                    candidate_work_id=cand.work_id,
                    statement=build_statement(c_res.active_grade),
                    human_review_required=CLAIM_GRADE[c_res.active_grade] != "evidence",
                ))
            if c_res.grade not in ("NONE", c_res.active_grade):
                shadow_metrics[cand.work_id] = {"classification": c_res.grade, "metrics": metrics}

            candidate_results.append(CandidateResult(work_id=cand.work_id, classification=c_res.grade,
                                                     metrics=metrics, error_reason=None))

            if v_res.credible and d_res is not None:
                key = (_RANK.get(c_res.grade, 0), v_res.inlier_count * v_res.inlier_coverage_q)
                if best is None or key > best[0]:
                    best = (key, cand.work_id, v_res, d_res)

        except Exception as e:
            logger.exception("Unhandled error processing candidate %s", cand.work_id)
            warnings.append(f"candidate {cand.work_id} failed: {type(e).__name__}: {e}")
            candidate_results.append(CandidateResult(work_id=cand.work_id, classification="NONE", metrics={},
                                                     error_reason=str(e)))

    timings["g2_verify"] = t2_sum
    timings["g3_dense"] = t3_sum
    timings["g4_classify"] = t4_sum

    # G5: evidence images for the strongest candidate only
    evidence_paths = {}
    if best is not None and with_evidence:
        t5 = time.monotonic()
        try:
            evidence_paths = await asyncio.to_thread(generate_evidence, check_id, best[3], best[2])
        except Exception as e:
            logger.exception("Failed to generate evidence.")
            warnings.append(f"evidence generation failed: {type(e).__name__}: {e}")
        timings["g5_evidence"] = time.monotonic() - t5

    # Origin signals (deterministic metadata; independent of the registry)
    try:
        o = check_origin(suspect_bytes)
        origin_dict = {
            "provenance_found": o.provenance_found,
            "details": o.details,
            "ai_generated_declared": o.ai_generated_declared,
            "c2pa": o.c2pa,
            "notes": o.notes,
            "ml_detector": o.ml_detector.__dict__,
            "watermark": o.watermark.__dict__,
        }
    except Exception as e:
        logger.exception("Failed to check origin.")
        warnings.append(f"origin check failed: {type(e).__name__}: {e}")
        origin_dict = {"provenance_found": False, "details": ["origin check failed"]}

    timings["total"] = time.monotonic() - t_start

    return Verdict(
        check_id=check_id,
        claims=claims,
        candidates=candidate_results,
        metrics={"lead_score": lead_score},
        shadow=shadow_metrics,
        origin=origin_dict,
        evidence_paths=evidence_paths,
        evidence_work_id=best[1] if best is not None and evidence_paths else None,
        timings=Timings(**timings),
        pipeline_version=PIPELINE_VERSION,
        config_hash=config_hash,
        config_snapshot=config_snapshot,
        warnings=warnings,
    )
