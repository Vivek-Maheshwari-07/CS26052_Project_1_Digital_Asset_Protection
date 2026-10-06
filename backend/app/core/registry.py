import asyncio
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

import numpy as np
from PIL import Image
from sqlalchemy import String, bindparam, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import AppConfig
from app.core.hasher import Hashes
from app.core.ingest import Ingested
from app.core.sql import Q4_CONFLICT, Q5_REGISTER_LOCK
from app.core.storage import LocalStorage
from app.models import Image as ImageModel


@dataclass(frozen=True)
class Fingerprints:
    sha256: str
    width: int
    height: int
    source_format: str
    phash: str
    dhash: str
    ahash: str
    whash: str
    low_detail: bool
    clip: np.ndarray
    dino: np.ndarray

    @classmethod
    def from_parts(
        cls,
        ingested: Ingested,
        hashes: Hashes,
        clip: np.ndarray,
        dino: np.ndarray,
    ) -> "Fingerprints":
        return cls(
            sha256=ingested.sha256,
            width=ingested.width,
            height=ingested.height,
            source_format=ingested.source_format,
            phash=hashes.phash,
            dhash=hashes.dhash,
            ahash=hashes.ahash,
            whash=hashes.whash,
            low_detail=hashes.low_detail,
            clip=clip,
            dino=dino,
        )

    def conflict_params(self, cfg: AppConfig) -> dict[str, Any]:
        return {
            "sha": self.sha256,
            "low": self.low_detail,
            "phash": self.phash,
            "dhash": self.dhash,
            "ahash": self.ahash,
            "whash": self.whash,
            "hmax": cfg.registration.hamming_conflict_max,
            "dino": self.dino,
            "clip": self.clip,
            "cmin": cfg.registration.dino_cosine_conflict_min,
        }


class NearDuplicate(Exception):
    """Raised when an image conflicts with an existing registered image."""

    def __init__(self, row: Any):
        super().__init__("A visually matching image is already registered.")
        self.row = row


async def _conflict_row(session: AsyncSession, fp: Fingerprints, cfg: AppConfig) -> Any:
    res = await session.execute(Q4_CONFLICT, fp.conflict_params(cfg))
    row = res.mappings().first()
    if row:
        return row
    stmt = text("""
        SELECT id, registered_at, 'sha256' AS reason,
               0 AS d_phash, 0 AS d_dhash, 0 AS d_ahash, 0 AS d_whash,
               1.0 AS cos_dino, 1.0 AS cos_clip
        FROM images
        WHERE sha256 = :sha
        LIMIT 1
    """).bindparams(bindparam("sha", type_=String))
    res2 = await session.execute(stmt, {"sha": fp.sha256})
    return res2.mappings().first()


async def register_atomic(
    session: AsyncSession,
    fp: Fingerprints,
    img: Image.Image,
    owner_name: str | None,
    original_filename: str | None,
    cfg: AppConfig,
    storage: LocalStorage,
    clip_id: str,
    dino_id: str,
) -> ImageModel:
    """Atomic registration inside transaction with pg_advisory_xact_lock and storage rollback."""
    image_id = uuid4()
    written = False
    committed = False

    try:
        async with session.begin():
            await session.execute(Q5_REGISTER_LOCK)
            row = (await session.execute(Q4_CONFLICT, fp.conflict_params(cfg))).mappings().first()
            if row:
                raise NearDuplicate(row)

            file_path = await asyncio.to_thread(storage.write_png, image_id, img)
            written = True
            await asyncio.to_thread(storage.write_thumb, image_id, img)

            image = ImageModel(
                id=image_id,
                file_path=file_path,
                owner_name=owner_name,
                original_filename=original_filename,
                sha256=fp.sha256,
                width=fp.width,
                height=fp.height,
                source_format=fp.source_format,
                phash=fp.phash,
                dhash=fp.dhash,
                ahash=fp.ahash,
                whash=fp.whash,
                low_detail=fp.low_detail,
                clip_emb=fp.clip,
                dino_emb=fp.dino,
                clip_model=clip_id,
                dino_model=dino_id,
                config_version=cfg.config_version,
            )
            session.add(image)

        committed = True
    except IntegrityError:
        row = await _conflict_row(session, fp, cfg)
        raise NearDuplicate(row) from None
    finally:
        if written and not committed:
            await asyncio.to_thread(storage.delete, image_id)

    await session.refresh(image)
    return image
