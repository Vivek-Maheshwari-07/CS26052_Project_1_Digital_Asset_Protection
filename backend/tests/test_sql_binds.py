import secrets

import numpy as np
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, sessionmaker

from app.core.hasher import hamming
from app.core.sql import Q2_STAGE1, Q3_STAGE2, Q4_CONFLICT
from app.db import make_sync_engine
from app.models import Image
from tests.factories import image_row, random_hex_hash, random_unit_vector


@pytest.mark.asyncio
async def test_typed_sql_binds_parity(async_engine, db_url, clean_db):
    sync_url = db_url
    if sync_url.startswith("postgresql://"):
        sync_url = sync_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif sync_url.startswith("postgres://"):
        sync_url = sync_url.replace("postgres://", "postgresql+psycopg://", 1)

    sync_engine = make_sync_engine(sync_url)

    # 1. Insert 20 rows
    inserted_images_data = []
    for idx in range(20):
        h_p = random_hex_hash()
        h_d = random_hex_hash()
        h_a = random_hex_hash()
        h_w = random_hex_hash()
        d_vec = random_unit_vector(768)
        c_vec = random_unit_vector(512)
        row = image_row(
            sha256=secrets.token_hex(32),
            file_path=f"storage/bind_test_{idx:03d}.jpg",
            phash=h_p,
            dhash=h_d,
            ahash=h_a,
            whash=h_w,
            dino_emb=d_vec,
            clip_emb=c_vec,
        )
        inserted_images_data.append(row)

    async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    db_images = []
    async with async_session() as session:
        for r in inserted_images_data:
            img = Image(**r)
            session.add(img)
            db_images.append(img)
        await session.commit()
        # Refresh to get IDs
        for img in db_images:
            await session.refresh(img)

    img_map = {img.id: img for img in db_images}

    # Query inputs: hex strings for hashes and numpy arrays for vectors
    query_phash = random_hex_hash()
    query_dhash = random_hex_hash()
    query_ahash = random_hex_hash()
    query_whash = random_hex_hash()
    query_dino = np.asarray(random_unit_vector(768), dtype=np.float32)
    query_clip = np.asarray(random_unit_vector(512), dtype=np.float32)

    # -------------------------------------------------------------------------
    # Test Q2_STAGE1
    # -------------------------------------------------------------------------
    q2_params = {
        "phash": query_phash,
        "dhash": query_dhash,
        "ahash": query_ahash,
        "whash": query_whash,
        "k": 10,
    }

    async with async_session() as session:
        res_async = await session.execute(Q2_STAGE1, q2_params)
        q2_async_rows = res_async.mappings().all()

    with Session(sync_engine) as session:
        res_sync = session.execute(Q2_STAGE1, q2_params)
        q2_sync_rows = res_sync.mappings().all()

    assert len(q2_async_rows) == 10
    assert len(q2_sync_rows) == 10
    assert [r["id"] for r in q2_async_rows] == [r["id"] for r in q2_sync_rows]

    for r in q2_async_rows:
        st = img_map[r["id"]]
        assert r["d_phash"] == hamming(query_phash, st.phash)
        assert r["d_dhash"] == hamming(query_dhash, st.dhash)
        assert r["d_ahash"] == hamming(query_ahash, st.ahash)
        assert r["d_whash"] == hamming(query_whash, st.whash)

    # -------------------------------------------------------------------------
    # Test Q3_STAGE2
    # -------------------------------------------------------------------------
    q3_params = {
        "phash": query_phash,
        "dhash": query_dhash,
        "ahash": query_ahash,
        "whash": query_whash,
        "dino": query_dino,
        "clip": query_clip,
        "k": 10,
    }

    async with async_session() as session:
        res_async = await session.execute(Q3_STAGE2, q3_params)
        q3_async_rows = res_async.mappings().all()

    with Session(sync_engine) as session:
        res_sync = session.execute(Q3_STAGE2, q3_params)
        q3_sync_rows = res_sync.mappings().all()

    assert len(q3_async_rows) == 10
    assert len(q3_sync_rows) == 10
    assert [r["id"] for r in q3_async_rows] == [r["id"] for r in q3_sync_rows]

    for r in q3_async_rows:
        st = img_map[r["id"]]
        assert r["d_phash"] == hamming(query_phash, st.phash)
        assert r["d_dhash"] == hamming(query_dhash, st.dhash)
        assert r["d_ahash"] == hamming(query_ahash, st.ahash)
        assert r["d_whash"] == hamming(query_whash, st.whash)
        cos_dino = float(r["cos_dino"])
        cos_clip = float(r["cos_clip"])
        expected_dino = float(np.dot(query_dino, np.asarray(st.dino_emb, dtype=np.float32)))
        expected_clip = float(np.dot(query_clip, np.asarray(st.clip_emb, dtype=np.float32)))
        assert np.isclose(cos_dino, expected_dino, atol=1e-5)
        assert np.isclose(cos_clip, expected_clip, atol=1e-5)

    # -------------------------------------------------------------------------
    # Test Q4_CONFLICT with existing SHA
    # -------------------------------------------------------------------------
    target_img = db_images[0]
    q4_params_sha = {
        "sha": target_img.sha256,
        "low": False,
        "phash": query_phash,
        "dhash": query_dhash,
        "ahash": query_ahash,
        "whash": query_whash,
        "hmax": 10,
        "dino": query_dino,
        "clip": query_clip,
        "cmin": 0.90,
    }

    async with async_session() as session:
        res_async = await session.execute(Q4_CONFLICT, q4_params_sha)
        q4_async_row = res_async.mappings().one()

    with Session(sync_engine) as session:
        res_sync = session.execute(Q4_CONFLICT, q4_params_sha)
        q4_sync_row = res_sync.mappings().one()

    assert q4_async_row["id"] == target_img.id
    assert q4_sync_row["id"] == target_img.id
    assert q4_async_row["reason"] == "sha256"
    assert q4_sync_row["reason"] == "sha256"
