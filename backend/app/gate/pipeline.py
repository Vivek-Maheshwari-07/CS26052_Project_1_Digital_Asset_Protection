"""The gate pipeline entry point: G0 normalise -> G1 retrieve -> G2 verify -> G3 dense -> G4 classify
-> G5 evidence, plus the origin module in parallel."""
import asyncio
import logging
import time
import uuid
from typing import Any, Callable, List, Optional

import numpy as np

from app.gate.classify import classify_candidate
from app.gate.dense import compute_dense_evidence
from app.gate.evidence import generate_evidence
from app.gate.features import load_target_with_alpha
from app.gate.normalize import InvalidImageError, normalize_image
from app.gate.origin import check_origin
from app.gate.retrieve import retrieve
from app.gate.settings import config_hash, config_snapshot, settings
from app.gate.verdict import CLAIM_GRADE, CandidateResult, Claim, Timings, Verdict, build_statement
from app.gate.verify import (FEATURE_VERSION, QueryFeatures, get_cached_features, get_cached_size,
                             verify_geometry, verify_whole_image_ecc)

logger = logging.getLogger(__name__)
PIPELINE_VERSION = settings.version

# Candidates are ranked best-first by their natural grade, then by inlier support.
_RANK = {"TIER1": 3, "TIER2": 2, "RELATED_DIFFERENT_CAPTURE": 1}


def _match_sample(v_res, limit=48):
    """A spread of the SIFT inlier matches as coordinates normalised to each image's working frame,
    so a UI can draw the real correspondences (query side is in the flipped frame when v_res.flip)."""
    if v_res.q_inliers is None or len(v_res.q_inliers) == 0 or not v_res.q_size or not v_res.t_size:
        return []
    n = len(v_res.q_inliers)
    idx = np.linspace(0, n - 1, min(limit, n)).astype(int)
    qw, qh = v_res.q_size
    tw, th = v_res.t_size
    return [[round(float(v_res.q_inliers[i][0]) / qw, 4), round(float(v_res.q_inliers[i][1]) / qh, 4),
             round(float(v_res.t_inliers[i][0]) / tw, 4), round(float(v_res.t_inliers[i][1]) / th, 4)] for i in idx]


async def _process_candidate(cand, db, norm_img, qfeats, emit=None) -> dict:
    """G2-G4 for one candidate. Never raises: failures come back as a CandidateResult with a reason."""
    out = {"result": None, "claim": None, "shadow": None, "best": None, "warnings": [], "t2": 0.0, "t3": 0.0, "t4": 0.0}

    def failed(reason):
        out["result"] = CandidateResult(work_id=cand.work_id, classification="NONE", metrics={}, error_reason=reason)
        return out

    try:
        t2 = time.monotonic()
        doc = await db.works.find_one({"id": cand.work_id}, {"width": 1, "height": 1, "image_path": 1})
        if not doc:
            return failed("Work not found.")
        try:
            target_kps, target_descs = await asyncio.to_thread(get_cached_features, cand.work_id, FEATURE_VERSION)
        except ValueError:
            out["warnings"].append(f"features missing for {cand.work_id}; run the gate backfill")
            return failed("Target features not cached.")
        size = get_cached_size(cand.work_id, FEATURE_VERSION) or (doc.get("width") or 1024, doc.get("height") or 1024)

        v_res = await asyncio.to_thread(verify_geometry, norm_img, target_kps, target_descs, size[0], size[1], qfeats)

        target_img, target_alpha = None, None
        if (not v_res.credible and v_res.low_feature and settings.ecc_fallback
                and cand.dino_sim >= settings.ecc_fallback_min_dino):
            # Flat art has too few keypoints for SIFT: try aligning the whole image instead.
            target_img, target_alpha = await asyncio.to_thread(load_target_with_alpha, doc.get("image_path"))
            if target_img is not None:
                v_res = (await asyncio.to_thread(verify_whole_image_ecc, norm_img, target_img)) or v_res
        out["t2"] = time.monotonic() - t2
        if emit:
            emit("g2", work_id=cand.work_id, credible=v_res.credible, reason=v_res.reason, inliers=v_res.inlier_count,
                 coverage=round(v_res.inlier_coverage_q, 3), tight=round(v_res.tight_inlier_frac, 3), flip=v_res.flip,
                 method=v_res.method, scale=round(v_res.scale, 3), rotation=round(v_res.rotation, 1),
                 matches=_match_sample(v_res) if v_res.credible else [])

        # G3: dense evidence, only for geometrically credible candidates
        t3 = time.monotonic()
        d_res = None
        if v_res.credible:
            if target_img is None:
                target_img, target_alpha = await asyncio.to_thread(load_target_with_alpha, doc.get("image_path"))
            if target_img is None:
                out["warnings"].append(f"target image for {cand.work_id} could not be loaded")
            else:
                d_res = await asyncio.to_thread(compute_dense_evidence, target_img, norm_img, v_res, target_alpha)
        out["t3"] = time.monotonic() - t3
        if emit and d_res is not None:
            emit("g3", work_id=cand.work_id, residual_p90=round(d_res.residual_p90, 1), residual_median=round(d_res.residual_median, 1),
                 changed_frac=round(d_res.changed_frac, 4), flow_px=round(d_res.flow_median_px, 2),
                 hp_ncc=None if d_res.hp_ncc is None else round(d_res.hp_ncc, 3), info_frac=round(d_res.info_frac, 3))

        # G4: classify
        t4 = time.monotonic()
        c_res = classify_candidate(
            credible=v_res.credible,
            lead_score=cand.lead_score,
            lead_margin=cand.lead_margin,
            residual_p90=d_res.residual_p90 if d_res else None,
            flow_median=d_res.flow_median_px if d_res else None,
            edge_corr=d_res.edge_corr_fine if d_res else None,
            residual_median=d_res.residual_median if d_res else None,
            changed_frac=d_res.changed_frac if d_res else None,
            low_information=d_res.low_information if d_res else False,
            hp_ncc=d_res.hp_ncc if d_res else None,
        )
        out["t4"] = time.monotonic() - t4
        if emit:
            emit("g4", work_id=cand.work_id, grade=c_res.grade, active=c_res.active_grade, reason=c_res.reason)

        metrics = {
            "clip_sim": cand.clip_sim,
            "dino_sim": cand.dino_sim,
            "via_crop": cand.via_crop,
            "inlier_count": v_res.inlier_count,
            "inlier_coverage_q": v_res.inlier_coverage_q,
            "inlier_coverage_t": v_res.inlier_coverage_t,
            "tight_inlier_frac": v_res.tight_inlier_frac,
            "flip": v_res.flip,
            "flipped": v_res.flipped,
            "method": v_res.method,
            "low_feature": v_res.low_feature,
            "credible": v_res.credible,
            "verify_reason": v_res.reason,
        }
        if d_res:
            metrics.update({
                "residual_median": d_res.residual_median,
                "residual_p90": d_res.residual_p90,
                "changed_frac": d_res.changed_frac,
                "hp_ncc": d_res.hp_ncc,
                "noise_ncc": d_res.noise_ncc,
                "info_frac": d_res.info_frac,
                "low_information": d_res.low_information,
                "flow_median_px": d_res.flow_median_px,
                "edge_corr_fine": d_res.edge_corr_fine,
                "ssim": d_res.ssim,
                "ecc_applied": d_res.ecc_applied,
                "chroma_compared": d_res.chroma_compared,
            })

        if c_res.active_grade != "NONE":
            out["claim"] = Claim(
                classification=c_res.active_grade,
                grade=CLAIM_GRADE[c_res.active_grade],
                candidate_work_id=cand.work_id,
                statement=build_statement(c_res.active_grade),
                human_review_required=CLAIM_GRADE[c_res.active_grade] != "evidence",
            )
        if c_res.grade not in ("NONE", c_res.active_grade):
            out["shadow"] = {"classification": c_res.grade, "metrics": metrics}

        out["result"] = CandidateResult(work_id=cand.work_id, classification=c_res.grade, metrics=metrics,
                                        error_reason=None)
        if v_res.credible and d_res is not None:
            out["best"] = ((_RANK.get(c_res.grade, 0), v_res.inlier_count * v_res.inlier_coverage_q),
                           cand.work_id, v_res, d_res)
    except Exception as e:
        logger.exception("Unhandled error processing candidate %s", cand.work_id)
        out["warnings"].append(f"candidate {cand.work_id} failed: {type(e).__name__}: {e}")
        return failed(str(e))
    return out


async def run_gate(suspect_bytes: bytes, db: Any, check_id: Optional[str] = None, with_evidence: bool = True,
                   progress: Optional[Callable[..., None]] = None, owner_id: Optional[str] = None) -> Verdict:
    """Run the full detection pipeline. Raises InvalidImageError only for undecodable input;
    any stage failure is logged and recorded in `verdict.warnings` instead of being swallowed.
    `with_evidence=False` skips writing the G5 images (used at registration time)."""
    check_id = check_id or str(uuid.uuid4())

    def emit(stage, **data):
        """Report a stage to the caller (a UI polling a job). Never lets a UI problem fail the run."""
        if progress:
            try:
                progress(stage, **data)
            except Exception:
                logger.debug("progress callback failed", exc_info=True)

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
    emit("g0", width=norm_img.size[0], height=norm_img.size[1], seconds=round(timings["g0_normalize"], 2))

    # G1: retrieve
    t1 = time.monotonic()
    try:
        candidates, lead_score = await (retrieve(norm_img, db, owner_id=owner_id) if owner_id is not None else retrieve(norm_img, db))
    except Exception as e:
        logger.exception("Unexpected error in G1 retrieve.")
        warnings.append(f"retrieval failed: {type(e).__name__}: {e}")
        candidates, lead_score = [], 0.0
    timings["g1_retrieve"] = time.monotonic() - t1
    emit("g1", seconds=round(timings["g1_retrieve"], 2), lead_score=round(float(lead_score), 3),
         candidates=[{"work_id": c.work_id, "clip": round(c.clip_sim, 3), "dino": round(c.dino_sim, 3), "via_crop": c.via_crop} for c in candidates])

    # G2-G4: candidates run concurrently (OpenCV releases the GIL), sharing one set of query features
    tc = time.monotonic()
    qfeats = QueryFeatures(norm_img)
    sem = asyncio.Semaphore(max(1, settings.max_parallel_candidates))

    async def guarded(cand):
        async with sem:
            return await _process_candidate(cand, db, norm_img, qfeats, emit)

    processed = await asyncio.gather(*(guarded(c) for c in candidates))
    timings["candidates_wall"] = time.monotonic() - tc

    candidate_results, claims, shadow_metrics, best = [], [], {}, None
    for cand, p in zip(candidates, processed):
        warnings.extend(p["warnings"])
        candidate_results.append(p["result"])
        if p["claim"]:
            claims.append(p["claim"])
        if p["shadow"]:
            shadow_metrics[cand.work_id] = p["shadow"]
        if p["best"] and (best is None or p["best"][0] > best[0]):
            best = p["best"]
    timings["g2_verify"] = sum(p["t2"] for p in processed)
    timings["g3_dense"] = sum(p["t3"] for p in processed)
    timings["g4_classify"] = sum(p["t4"] for p in processed)

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
        emit("g5", evidence_paths=evidence_paths, work_id=best[1])

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
