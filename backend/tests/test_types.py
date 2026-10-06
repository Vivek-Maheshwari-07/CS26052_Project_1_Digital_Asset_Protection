import secrets

import numpy as np
import pytest
from sqlalchemy import bindparam, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, sessionmaker

from app.db import make_sync_engine
from app.models import Image
from app.types import Hash64, bits_to_hex, hex_to_bits
from tests.factories import image_row, random_hex_hash, random_unit_vector


def test_helpers():
    h = "c3a1f0e4b2d59687"
    b = hex_to_bits(h)
    assert len(b) == 64
    assert set(b).issubset({"0", "1"})
    assert bits_to_hex(b) == h

    # Edge cases
    assert hex_to_bits("0000000000000000") == "0" * 64
    assert bits_to_hex("0" * 64) == "0000000000000000"
    assert hex_to_bits("ffffffffffffffff") == "1" * 64
    assert bits_to_hex("1" * 64) == "ffffffffffffffff"


@pytest.mark.asyncio
async def test_hash64_and_vector_roundtrip_async(async_engine, clean_db):
    async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

    test_hashes = ["0000000000000000", "ffffffffffffffff", "8000000000000001"]
    for _ in range(1000):
        test_hashes.append(random_hex_hash())

    dino_vec = random_unit_vector(768)
    clip_vec = random_unit_vector(512)

    async with async_session() as session:
        images_to_add = [
            Image(
                **image_row(
                    sha256=secrets.token_hex(32),
                    file_path=f"storage/async_test_{idx:05d}.jpg",
                    phash=h,
                    dhash=h,
                    ahash=h,
                    whash=h,
                    dino_emb=dino_vec,
                    clip_emb=clip_vec,
                )
            )
            for idx, h in enumerate(test_hashes)
        ]
        session.add_all(images_to_add)
        await session.commit()

        # Read back and verify
        res = await session.execute(select(Image).order_by(Image.file_path))
        images = res.scalars().all()
        assert len(images) == len(test_hashes)

        for img, expected_h in zip(images, test_hashes, strict=False):
            assert img.phash == expected_h
            assert img.dhash == expected_h
            assert img.ahash == expected_h
            assert img.whash == expected_h
            assert np.allclose(np.array(img.dino_emb), np.array(dino_vec), atol=1e-6)

        # SQL similarity check: 1 - (dino_emb <=> dino_emb) = 1.0 ± 1e-6
        first_id = images[0].id
        sim_res = await session.execute(
            text("SELECT 1 - (dino_emb <=> dino_emb) FROM images WHERE id = :id"),
            {"id": first_id},
        )
        sim_val = sim_res.scalar()
        assert np.isclose(sim_val, 1.0, atol=1e-6)

        # Hamming distance bound through Hash64
        q_hash = "ffffffffffffffff"
        stmt = text("SELECT phash <~> CAST(:q AS bit(64)) FROM images WHERE id = :id").bindparams(
            bindparam("q", type_=Hash64)
        )
        p_res = await session.execute(
            stmt,
            {"q": q_hash, "id": first_id},
        )
        dist_val = p_res.scalar()
        expected_dist = (int(images[0].phash, 16) ^ int(q_hash, 16)).bit_count()
        assert dist_val == expected_dist


def test_hash64_roundtrip_sync(db_url, clean_db):
    sync_url = db_url
    if sync_url.startswith("postgresql://"):
        sync_url = sync_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif sync_url.startswith("postgres://"):
        sync_url = sync_url.replace("postgres://", "postgresql+psycopg://", 1)

    engine = make_sync_engine(sync_url)

    test_hashes = ["0000000000000000", "ffffffffffffffff", "8000000000000001"]
    for _ in range(1000):
        test_hashes.append(random_hex_hash())

    dino_vec = random_unit_vector(768)
    clip_vec = random_unit_vector(512)

    with Session(engine) as session:
        images_to_add = [
            Image(
                **image_row(
                    sha256=secrets.token_hex(32),
                    file_path=f"storage/sync_test_{idx:05d}.jpg",
                    phash=h,
                    dhash=h,
                    ahash=h,
                    whash=h,
                    dino_emb=dino_vec,
                    clip_emb=clip_vec,
                )
            )
            for idx, h in enumerate(test_hashes)
        ]
        session.add_all(images_to_add)
        session.commit()

        # Read back and verify
        images = session.scalars(select(Image).order_by(Image.file_path)).all()
        assert len(images) == len(test_hashes)

        for img, expected_h in zip(images, test_hashes, strict=False):
            assert img.phash == expected_h
            assert img.dhash == expected_h
            assert img.ahash == expected_h
            assert img.whash == expected_h
            assert np.allclose(np.array(img.dino_emb), np.array(dino_vec), atol=1e-6)

        # SQL similarity check: 1 - (dino_emb <=> dino_emb) = 1.0 ± 1e-6
        first_id = images[0].id
        sim_val = session.execute(
            text("SELECT 1 - (dino_emb <=> dino_emb) FROM images WHERE id = :id"),
            {"id": first_id},
        ).scalar()
        assert np.isclose(sim_val, 1.0, atol=1e-6)

        # Hamming distance bound through Hash64
        q_hash = "ffffffffffffffff"
        stmt = text("SELECT phash <~> CAST(:q AS bit(64)) FROM images WHERE id = :id").bindparams(
            bindparam("q", type_=Hash64)
        )
        dist_val = session.execute(
            stmt,
            {"q": q_hash, "id": first_id},
        ).scalar()
        expected_dist = (int(images[0].phash, 16) ^ int(q_hash, 16)).bit_count()
        assert dist_val == expected_dist
