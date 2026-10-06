import pathlib

import pytest
from alembic.config import Config
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.models import Image
from tests.factories import image_row


def test_alembic_check(migrated_db):
    backend_dir = pathlib.Path(__file__).resolve().parent.parent
    alembic_cfg = Config(str(backend_dir / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))

    # alembic check compares Base.metadata against the live migrated schema
    command.check(alembic_cfg)


@pytest.mark.asyncio
async def test_orm_insert_and_readback(async_engine, clean_db):
    async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

    data = image_row(
        phash="c3a1f0e4b2d59687",
        dhash="8e0f1c3e7c7e3c18",
        ahash="ffe7c38181c3e7ff",
        whash="ffc3818181c3e7ff",
    )

    async with async_session() as session:
        img = Image(**data)
        session.add(img)
        await session.commit()

        res = await session.execute(select(Image).where(Image.id == data["id"]))
        fetched = res.scalar_one()

        assert fetched.phash == "c3a1f0e4b2d59687"
        assert fetched.dhash == "8e0f1c3e7c7e3c18"
        assert fetched.ahash == "ffe7c38181c3e7ff"
        assert fetched.whash == "ffc3818181c3e7ff"
        assert fetched.owner_name == data["owner_name"]
        assert fetched.sha256 == data["sha256"]
