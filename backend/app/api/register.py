import asyncio
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_embedder
from app.config import get_config
from app.core.embedder import embed_gated
from app.core.hasher import compute_hashes
from app.core.ingest import ingest, read_limited
from app.core.registry import Fingerprints, NearDuplicate, register_atomic
from app.db import get_session
from app.limiter import limiter
from app.schemas import (
    ConflictResponse,
    ConflictThresholds,
    CosineScores,
    ExistingMatch,
    HammingScores,
    ModelsInfo,
    RegisterResponse,
)
from app.schemas import (
    Fingerprints as FingerprintsSchema,
)

router = APIRouter()


def register_limit() -> str:
    return f"{get_config().rate_limits.register_per_minute}/minute"


@router.post("/register", status_code=201, response_model=RegisterResponse)
@limiter.limit(register_limit)
async def register_image(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    owner_name: Annotated[str | None, Form(max_length=100)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
    embedder: Annotated[Any, Depends(get_embedder)] = None,
):
    cfg = getattr(request.app.state, "config", None) or get_config()

    clean_owner_name = owner_name.strip() if owner_name and owner_name.strip() else None

    raw = await read_limited(file, max_bytes=cfg.limits.max_upload_mb * 1024 * 1024)
    ingested = await asyncio.to_thread(ingest, raw, cfg.limits)
    hashes = await asyncio.to_thread(compute_hashes, ingested.image, cfg)

    clip, dino = await embed_gated(
        embedder,
        ingested.image,
        request.app.state.inference_gate,
        cfg.limits.inference_wait_s,
    )

    fp = Fingerprints.from_parts(ingested, hashes, clip, dino)
    original_filename = (file.filename or "")[:255] or None

    storage = request.app.state.storage
    clip_id = getattr(embedder, "clip_id", cfg.models.clip)
    dino_id = getattr(embedder, "dino_id", cfg.models.dino)

    try:
        image = await register_atomic(
            session=session,
            fp=fp,
            img=ingested.image,
            owner_name=clean_owner_name,
            original_filename=original_filename,
            cfg=cfg,
            storage=storage,
            clip_id=clip_id,
            dino_id=dino_id,
        )
    except NearDuplicate as exc:
        row = exc.row
        conflict_data = ConflictResponse(
            error="near_duplicate",
            reason=row["reason"],
            message="A visually matching image is already registered.",
            existing=ExistingMatch(
                image_id=row["id"],
                registered_at=row["registered_at"],
                thumbnail_url=f"/api/images/{row['id']}/file?size=thumb",
                hamming=HammingScores(
                    phash=row["d_phash"],
                    dhash=row["d_dhash"],
                    ahash=row["d_ahash"],
                    whash=row["d_whash"],
                ),
                cosine=CosineScores(
                    dino=round(float(row["cos_dino"]), 4) if row["cos_dino"] is not None else None,
                    clip=round(float(row["cos_clip"]), 4) if row["cos_clip"] is not None else None,
                ),
            ),
            thresholds=ConflictThresholds(
                hamming_conflict_max=cfg.registration.hamming_conflict_max,
                dino_cosine_conflict_min=cfg.registration.dino_cosine_conflict_min,
            ),
        )
        return JSONResponse(status_code=409, content=conflict_data.model_dump(mode="json"))

    return RegisterResponse(
        image_id=image.id,
        owner_name=image.owner_name,
        registered_at=image.registered_at,
        sha256=image.sha256,
        width=image.width,
        height=image.height,
        low_detail=image.low_detail,
        fingerprints=FingerprintsSchema(
            phash=image.phash,
            dhash=image.dhash,
            ahash=image.ahash,
            whash=image.whash,
        ),
        models=ModelsInfo(
            clip=image.clip_model,
            dino=image.dino_model,
            config_version=image.config_version,
        ),
        record_url=f"/api/images/{image.id}/record",
    )
