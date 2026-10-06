import asyncio

import numpy as np
from mongomock_motor import AsyncMongoMockClient

from app.fingerprint.combine import combined_confidence
from app.registry import anchor
from app.registry.index import SimilarityIndex


def unit(v):
    v = np.asarray(v, dtype=np.float32)
    return (v / np.linalg.norm(v)).tolist()


def test_index_search_matches_scalar_scores():
    idx = SimilarityIndex()
    db = object()
    idx._db = db
    a, b, c = unit([1, 0, 0, 0]), unit([0, 1, 0, 0]), unit([1, 1, 0, 0])
    idx.add(db, "a", "u1", a, "ffffffffffffffff")
    idx.add(db, "b", "u2", b, "0000000000000000")
    idx.add(db, "c", "u1", c, "ffffffff00000000")

    hits = idx.search(a, "ffffffffffffffff", k=3)
    assert [h["work_id"] for h in hits] == ["a", "c", "b"]
    assert hits[0]["phash_score"] == 1.0 and abs(hits[0]["embedding_score"] - 1) < 1e-6
    assert abs(hits[1]["phash_score"] - 0.5) < 1e-9
    assert abs(hits[1]["confidence"] - float(combined_confidence(0.5, hits[1]["embedding_score"]))) < 1e-6


def test_index_resyncs_for_new_db():
    async def run():
        db = AsyncMongoMockClient().idx_test
        await db.works.insert_one({"id": "w1", "user_id": "u", "embedding": unit([1, 0]), "phash": "ff" * 8})
        idx = SimilarityIndex()
        await idx.sync(db)
        assert idx.ids == ["w1"]
        await db.works.insert_one({"id": "w2", "user_id": "u", "embedding": unit([0, 1]), "phash": "00" * 8})
        await idx.sync(db)  # count changed -> rebuild
        assert idx.ids == ["w1", "w2"]
    asyncio.run(run())


def test_ots_file_layout():
    digest = bytes(range(32))
    data = anchor.build_ots_file(digest, b"\xf0\x10" + b"x" * 16)
    assert data.startswith(anchor.OTS_MAGIC)
    assert data[len(anchor.OTS_MAGIC)] == 1           # major version
    assert data[len(anchor.OTS_MAGIC) + 1] == 0x08     # sha256 file hash op
    assert data[len(anchor.OTS_MAGIC) + 2:][:32] == digest
