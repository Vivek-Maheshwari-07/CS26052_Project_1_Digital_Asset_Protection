import secrets

import numpy as np
import pytest
from sqlalchemy import bindparam, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

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
    for _ in range(50):  # Sample representative random hashes
        test_hashes.append(random_hex_hash())

    dino_vec = random_unit_vector(768)
    clip_vec = random_unit_vector(512)

    async with async_session() as session:
        for idx, h in enumerate(test_hashes):
            img_data = image_row(
                sha256=secrets.token_hex(32),
                file_path=f"storage/async_test_{idx:04d}.jpg",
                phash=h,
                dhash=h,
                ahash=h,
                whash=h,
                dino_emb=dino_vec,
                clip_emb=clip_vec,
            )
            img = Image(**img_data)
            session.add(img)
        await session.commit()

        # Read back and verify
        res = await session.execute(select(Image).order_by(Image.file_path))
        images = res.scalars().all()
        assert len(images) == len(test_hashes)

        for img, expected_h in zip(images, test_hashes):
            assert img.phash == expected_h
            assert img.dhash == expected_h
            assert img.ahash == expected_h
            assert img.whash == expected_h
            assert np.allclose(np.array(img.dino_emb), np.array(dino_vec), atol=1e-5)

        # SQL similarity check: 1 - (dino_emb <=> dino_emb) = 1.0
        first_id = images[0].id
        sim_res = await session.execute(
            text("SELECT 1 - (dino_emb <=> :vec) FROM images WHERE id = :id"),
            {"vec": dino_vec, "id": first_id},
        )
        sim_val = sim_res.scalar()
        assert np.isclose(sim_val, 1.0, atol=1e-5)

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


def test_hash64_roundtrip_sync(db_conn, clean_db):
    test_hashes = ["0000000000000000", "ffffffffffffffff", "8000000000000001"]
    for _ in range(50):
        test_hashes.append(random_hex_hash())

    dino_vec = random_unit_vector(768)
    clip_vec = random_unit_vector(512)

    with db_conn.cursor() as cur:
        for idx, h in enumerate(test_hashes):
            data = image_row(
                sha256=secrets.token_hex(32),
                file_path=f"storage/sync_test_{idx:04d}.jpg",
                phash=h,
                dhash=h,
                ahash=h,
                whash=h,
                dino_emb=dino_vec,
                clip_emb=clip_vec,
            )
            cur.execute(
                """
                INSERT INTO images (
                    id, file_path, source_format, sha256, width, height,
                    phash, dhash, ahash, whash, low_detail,
                    clip_emb, dino_emb, clip_model, dino_model, config_version
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s::bit(64), %s::bit(64), %s::bit(64), %s::bit(64), %s,
                    %s::vector, %s::vector, %s, %s, %s
                )
                """,
                (
                    data["id"],
                    data["file_path"],
                    data["source_format"],
                    data["sha256"],
                    data["width"],
                    data["height"],
                    hex_to_bits(data["phash"]),
                    hex_to_bits(data["dhash"]),
                    hex_to_bits(data["ahash"]),
                    hex_to_bits(data["whash"]),
                    data["low_detail"],
                    str(data["clip_emb"]),
                    str(data["dino_emb"]),
                    data["clip_model"],
                    data["dino_model"],
                    data["config_version"],
                ),
            )

        cur.execute("SELECT phash, dhash, ahash, whash FROM images ORDER BY file_path")
        rows = cur.fetchall()
        assert len(rows) == len(test_hashes)
        for row, expected_h in zip(rows, test_hashes):
            # Postgres returns bit string
            assert bits_to_hex(row[0]) == expected_h
            assert bits_to_hex(row[1]) == expected_h
            assert bits_to_hex(row[2]) == expected_h
            assert bits_to_hex(row[3]) == expected_h
