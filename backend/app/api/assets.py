"""Registered-image detail, file streaming and the Registration Record."""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image as PILImage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import defer

from app.core.storage import LocalStorage
from app.db import get_session
from app.errors import NotFound
from app.models import Image as ImageModel
from app.schemas import Fingerprints, ImageDetail, ModelsInfo, RegistrationRecord

logger = logging.getLogger("provnet")

router = APIRouter(prefix="/images", tags=["images"])

REGISTRATION_DISCLAIMER = (
    "This Registration Record attests only that an image with the fingerprints above was submitted "
    "to ProvNet at the stated time. It is not a provenance certificate and is not proof of "
    "authorship, ownership or copyright. The owner name was supplied by the submitter and has not "
    "been verified. The SHA-256 digest covers the originally uploaded bytes; the stored copy is a "
    "metadata-stripped PNG re-encoding of the same pixels."
)

# Files are content-addressed by an immutable UUID, so they can be cached indefinitely.
IMMUTABLE_CACHE = "public, max-age=31536000, immutable"


async def _load_image(session: AsyncSession, image_id: UUID) -> ImageModel:
    """Fetch an image row without its 512-d/768-d embeddings (never needed by these endpoints)."""
    stmt = (
        select(ImageModel)
        .options(defer(ImageModel.clip_emb), defer(ImageModel.dino_emb))
        .where(ImageModel.id == image_id)
    )
    image = (await session.execute(stmt)).scalar_one_or_none()
    if image is None:
        raise NotFound("Image not found.")
    return image


def _fingerprints(image: ImageModel) -> Fingerprints:
    return Fingerprints(phash=image.phash, dhash=image.dhash, ahash=image.ahash, whash=image.whash)


def _models(image: ImageModel) -> ModelsInfo:
    return ModelsInfo(clip=image.clip_model, dino=image.dino_model, config_version=image.config_version)


def _regenerate_thumb(storage: LocalStorage, image_id: UUID) -> None:
    with PILImage.open(storage.path(image_id, "full")) as full:
        full.load()
        storage.write_thumb(image_id, full)


@router.get("/{image_id}", response_model=ImageDetail)
async def get_image_detail(
    image_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
):
    image = await _load_image(session, image_id)
    return ImageDetail(
        image_id=image.id,
        owner_name=image.owner_name,
        registered_at=image.registered_at,
        sha256=image.sha256,
        width=image.width,
        height=image.height,
        source_format=image.source_format,
        low_detail=image.low_detail,
        fingerprints=_fingerprints(image),
        models=_models(image),
        file_url=f"/api/images/{image.id}/file",
        record_url=f"/api/images/{image.id}/record",
    )


@router.get(
    "/{image_id}/file",
    response_class=FileResponse,
    responses={200: {"content": {"image/png": {}}, "description": "Stored PNG (full or thumbnail)."}},
)
async def get_image_file(
    request: Request,
    image_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    size: Annotated[Literal["full", "thumb"], Query()] = "full",
):
    # The row check keeps a file written by a registration that later rolled back from being served.
    exists = (await session.execute(select(ImageModel.id).where(ImageModel.id == image_id))).first()
    if exists is None:
        raise NotFound("Image not found.")

    storage: LocalStorage = request.app.state.storage
    path = storage.path(image_id, size)

    if not path.is_file():
        full_path = storage.path(image_id, "full")
        if size == "thumb" and full_path.is_file():
            logger.warning("Thumbnail missing for %s; regenerating from full image", image_id)
            await asyncio.to_thread(_regenerate_thumb, storage, image_id)
        else:
            logger.error("Stored file missing for registered image %s (size=%s)", image_id, size)
            raise NotFound("Image file is missing from storage.")

    return FileResponse(
        path,
        media_type="image/png",
        filename=f"{image_id}{'-thumb' if size == 'thumb' else ''}.png",
        content_disposition_type="inline",
        headers={"Cache-Control": IMMUTABLE_CACHE, "X-Content-Type-Options": "nosniff"},
    )


@router.get("/{image_id}/record", response_model=RegistrationRecord)
async def get_registration_record(
    image_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    download: Annotated[bool, Query(description="Send as a downloadable .json attachment.")] = False,
):
    image = await _load_image(session, image_id)
    record = RegistrationRecord(
        image_id=image.id,
        owner_name=image.owner_name,
        registered_at=image.registered_at,
        issued_at=datetime.now(UTC),
        sha256=image.sha256,
        width=image.width,
        height=image.height,
        source_format=image.source_format,
        low_detail=image.low_detail,
        fingerprints=_fingerprints(image),
        models=_models(image),
        file_url=f"/api/images/{image.id}/file",
        record_url=f"/api/images/{image.id}/record",
        disclaimer=REGISTRATION_DISCLAIMER,
    )
    headers = {"Cache-Control": "no-store"}
    if download:
        headers["Content-Disposition"] = f'attachment; filename="provnet-record-{image.id}.json"'
    return JSONResponse(content=record.model_dump(mode="json"), headers=headers)
