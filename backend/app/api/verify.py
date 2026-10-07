"""Verification cascade: SHA-256 exact -> pHash Hamming (SQL) -> DINOv2/CLIP cosine (pgvector).

Design rules (locked):
* Hamming and cosine scores are reported side by side and never merged into one score.
* Deep models run only when the hash stage is not confident (d_H > threshold, low-detail query
  or low-detail candidate). Hash-decided results carry ``cosine = null``; the Evidence View fills
  them in on demand through ``POST /api/verify/deep``, which never changes the stored verdict.
* No database connection is held while a model runs: each DB phase is its own short transaction.
"""

import asyncio
import logging
import time
from collections.abc import Mapping, Sequence
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_embedder
from app.config import AppConfig, get_config
from app.core.embedder import embed_gated
from app.core.hasher import Hashes, compute_hashes
from app.core.ingest import ingest, read_limited
from app.core.sql import (
    Q1_EXACT,
    Q2_STAGE1,
    Q3_STAGE2,
    Q6_EF_SEARCH,
    Q9_HAMMING_BY_ID,
    Q10_COSINE_FOR_IDS,
)
from app.db import get_session
from app.errors import Busy, NotFound, ProvNetError
from app.limiter import limiter
from app.models import Verification
from app.schemas import (
    AboveThreshold,
    Candidate,
    CosineScores,
    DeepAboveThreshold,
    DeepCandidate,
    DeepVerifyResponse,
    EmbeddingStage,
    EvidenceThresholds,
    HammingScores,
    HashStage,
    QueryInfo,
    Sha256Stage,
    VerifyResponse,
    VerifyThresholds,
)

logger = logging.getLogger("provnet")

router = APIRouter(tags=["verify"])

MAX_CANDIDATES = 5
COSINE_DECIMALS = 4

Row = Mapping[str, Any]


class QueryMismatch(ProvNetError):
    def __init__(self) -> None:
        super().__init__(
            "The uploaded file is not the query image of this verification.",
            status=409,
            code="query_mismatch",
        )


def verify_limit() -> str:
    return f"{get_config().rate_limits.verify_per_minute}/minute"


def _cfg(request: Request) -> AppConfig:
    return getattr(request.app.state, "config", None) or get_config()


def _elapsed_ms(start: float) -> int:
    return max(0, round((time.perf_counter() - start) * 1000))


def _round_cos(value: Any) -> float | None:
    # Thresholds are compared on the rounded value, so a displayed 0.9000 is never "below" 0.90.
    return None if value is None else round(float(value), COSINE_DECIMALS)


def _hash_params(h: Hashes) -> dict[str, str]:
    return {"phash": h.phash, "dhash": h.dhash, "ahash": h.ahash, "whash": h.whash}


def _hash_confident(row: Row, query_low_detail: bool, cfg: AppConfig) -> bool:
    """pHash is trusted only when neither side is low-detail (flat images collide trivially)."""
    return (
        not query_low_detail
        and not row["low_detail"]
        and int(row["d_phash"]) <= cfg.cascade.hamming_confident_max
    )


def _dino_passes(cos_dino: float | None, cfg: AppConfig) -> bool | None:
    return None if cos_dino is None else cos_dino >= cfg.cascade.dino_cosine_match_min


def _candidate(rank: int, row: Row, query_low_detail: bool, cfg: AppConfig) -> Candidate:
    image_id = row["id"]
    cos_dino = _round_cos(row.get("cos_dino"))
    cos_clip = _round_cos(row.get("cos_clip"))
    return Candidate(
        rank=rank,
        image_id=image_id,
        owner_name=row["owner_name"],
        registered_at=row["registered_at"],
        thumbnail_url=f"/api/images/{image_id}/file?size=thumb",
        hamming=HammingScores(
            phash=int(row["d_phash"]),
            dhash=int(row["d_dhash"]),
            ahash=int(row["d_ahash"]),
            whash=int(row["d_whash"]),
        ),
        cosine=CosineScores(dino=cos_dino, clip=cos_clip),
        above_threshold=AboveThreshold(
            hash=_hash_confident(row, query_low_detail, cfg),
            dino=_dino_passes(cos_dino, cfg),
        ),
    )


def _candidates(rows: Sequence[Row], query_low_detail: bool, cfg: AppConfig) -> list[Candidate]:
    return [_candidate(i + 1, r, query_low_detail, cfg) for i, r in enumerate(rows[:MAX_CANDIDATES])]


def _evidence_thresholds(cfg: AppConfig) -> EvidenceThresholds:
    return EvidenceThresholds(**cfg.evidence_thresholds.model_dump())


@router.post("/verify", response_model=VerifyResponse)
@limiter.limit(verify_limit)
async def verify_image(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    session: Annotated[AsyncSession, Depends(get_session)] = None,
    embedder: Annotated[Any, Depends(get_optional_embedder)] = None,
):
    started = time.perf_counter()
    cfg = _cfg(request)

    raw = await read_limited(file, max_bytes=cfg.limits.max_upload_mb * 1024 * 1024)
    ingested = await asyncio.to_thread(ingest, raw, cfg.limits)
    hashes = await asyncio.to_thread(compute_hashes, ingested.image, cfg)
    low = hashes.low_detail
    hp = _hash_params(hashes)

    stages: list[Sha256Stage | HashStage | EmbeddingStage] = []
    candidates: list[Candidate] = []
    decided_by = "none"
    top_match: UUID | None = None
    need_embedding = False

    # ---- Stage 0 (SHA-256) and Stage 1 (pHash) share one short read transaction ----
    async with session.begin():
        await session.execute(Q6_EF_SEARCH)

        t = time.perf_counter()
        exact_id = (await session.execute(Q1_EXACT, {"sha": ingested.sha256})).scalar()
        exact_row = None
        if exact_id is not None:
            exact_row = (await session.execute(Q9_HAMMING_BY_ID, {**hp, "id": exact_id})).mappings().first()
        stages.append(Sha256Stage(hit=exact_row is not None, latency_ms=_elapsed_ms(t)))

        if exact_row is not None:
            decided_by = "sha256"
            top_match = exact_row["id"]
            candidates = _candidates([exact_row], low, cfg)
        else:
            t = time.perf_counter()
            rows = (await session.execute(Q2_STAGE1, {**hp, "k": cfg.cascade.top_k})).mappings().all()
            best_hamming = min((int(r["d_phash"]) for r in rows), default=None)
            confident_rows = [r for r in rows if _hash_confident(r, low, cfg)]
            stages.append(
                HashStage(
                    best_phash_hamming=best_hamming,
                    confident=bool(confident_rows),
                    latency_ms=_elapsed_ms(t),
                )
            )
            if confident_rows:
                decided_by = "hash"
                top_match = confident_rows[0]["id"]
                candidates = _candidates(rows, low, cfg)
            elif rows:
                need_embedding = True
            # An empty registry can never match: skip Stage 2 rather than run the models for nothing.

    # ---- Stage 2: deep embeddings (models run outside any DB transaction) ----
    if need_embedding:
        if embedder is None:
            raise Busy("Models are not loaded; this query needs the embedding stage.")
        t = time.perf_counter()
        clip, dino = await embed_gated(
            embedder, ingested.image, request.app.state.inference_gate, cfg.limits.inference_wait_s
        )
        async with session.begin():
            await session.execute(Q6_EF_SEARCH)
            rows = (
                (await session.execute(Q3_STAGE2, {**hp, "dino": dino, "clip": clip, "k": cfg.cascade.top_k}))
                .mappings()
                .all()
            )
        candidates = _candidates(rows, low, cfg)
        best_dino = max((c.cosine.dino for c in candidates if c.cosine.dino is not None), default=None)
        passed = bool(_dino_passes(best_dino, cfg))
        stages.append(EmbeddingStage(best_dino_cosine=best_dino, passed=passed, latency_ms=_elapsed_ms(t)))
        if passed:
            decided_by = "embedding"
            top_match = next(c.image_id for c in candidates if c.above_threshold.dino)

    verification_id = uuid4()
    latency_ms = _elapsed_ms(started)
    response = VerifyResponse(
        verification_id=verification_id,
        decided_by=decided_by,
        verdict="match" if decided_by != "none" else "no_match",
        query=QueryInfo(
            sha256=ingested.sha256,
            width=ingested.width,
            height=ingested.height,
            low_detail=low,
        ),
        thresholds=VerifyThresholds(
            hamming_confident_max=cfg.cascade.hamming_confident_max,
            dino_cosine_match_min=cfg.cascade.dino_cosine_match_min,
            evidence=_evidence_thresholds(cfg),
        ),
        config_version=cfg.config_version,
        stages=stages,
        candidates=candidates,
        latency_ms=latency_ms,
    )

    async with session.begin():
        session.add(
            Verification(
                id=verification_id,
                query_sha256=ingested.sha256,
                query_width=ingested.width,
                query_height=ingested.height,
                low_detail=low,
                decided_by=decided_by,
                top_match=top_match,
                stages=[s.model_dump(mode="json") for s in stages],
                candidates=[c.model_dump(mode="json") for c in candidates],
                config_version=cfg.config_version,
                latency_ms=latency_ms,
            )
        )

    logger.info(
        "verify id=%s decided_by=%s candidates=%d latency_ms=%d",
        verification_id,
        decided_by,
        len(candidates),
        latency_ms,
    )
    return response


@router.post("/verify/deep", response_model=DeepVerifyResponse)
@limiter.limit(verify_limit)
async def verify_deep(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    verification_id: Annotated[UUID, Form(...)],
    session: Annotated[AsyncSession, Depends(get_session)] = None,
    embedder: Annotated[Any, Depends(get_optional_embedder)] = None,
):
    """Compute CLIP and DINOv2 cosines for the candidates of an earlier verification.

    The client re-sends the query image (queries are never stored); its SHA-256 must equal the one
    recorded for ``verification_id``. Scores are display-only evidence: the cascade's verdict and
    the stored verification row are left untouched.
    """
    started = time.perf_counter()
    cfg = _cfg(request)

    async with session.begin():
        verification = await session.get(Verification, verification_id)
        if verification is None:
            raise NotFound("Verification not found.")
        decided_by = verification.decided_by
        query_sha256 = verification.query_sha256
        stored = sorted(verification.candidates or [], key=lambda c: int(c["rank"]))

    raw = await read_limited(file, max_bytes=cfg.limits.max_upload_mb * 1024 * 1024)
    ingested = await asyncio.to_thread(ingest, raw, cfg.limits)
    if ingested.sha256 != query_sha256:
        raise QueryMismatch()

    ranks = {UUID(str(c["image_id"])): int(c["rank"]) for c in stored[:MAX_CANDIDATES]}
    deep: list[DeepCandidate] = []
    embedding_latency_ms: int | None = None

    if ranks:
        if embedder is None:
            raise Busy("Models are not loaded.")
        t = time.perf_counter()
        clip, dino = await embed_gated(
            embedder, ingested.image, request.app.state.inference_gate, cfg.limits.inference_wait_s
        )
        embedding_latency_ms = _elapsed_ms(t)

        async with session.begin():
            rows = (
                (await session.execute(Q10_COSINE_FOR_IDS, {"dino": dino, "clip": clip, "ids": list(ranks)}))
                .mappings()
                .all()
            )

        for r in rows:  # images deleted since the verification are silently absent
            image_id = UUID(str(r["id"]))
            cos_dino = _round_cos(r["cos_dino"])
            cos_clip = _round_cos(r["cos_clip"])
            deep.append(
                DeepCandidate(
                    rank=ranks[image_id],
                    image_id=image_id,
                    cosine=CosineScores(dino=cos_dino, clip=cos_clip),
                    above_threshold=DeepAboveThreshold(
                        dino=cos_dino >= cfg.cascade.dino_cosine_match_min,
                        clip=cos_clip >= cfg.evidence_thresholds.clip,
                    ),
                )
            )
        deep.sort(key=lambda c: c.rank)

    return DeepVerifyResponse(
        verification_id=verification_id,
        decided_by=decided_by,
        query_sha256=query_sha256,
        thresholds=_evidence_thresholds(cfg),
        candidates=deep,
        embedding_latency_ms=embedding_latency_ms,
        latency_ms=_elapsed_ms(started),
    )
