import numpy as np
import pytest
from psycopg.errors import CheckViolation, UniqueViolation
from sqlalchemy.dialects import postgresql

from app.core.sql import (
    Q1_EXACT,
    Q2_STAGE1,
    Q3_STAGE2,
    Q4_CONFLICT,
    Q5_REGISTER_LOCK,
    Q6_EF_SEARCH,
    Q7_IMAGE_COUNT,
    Q7_PGVECTOR_VERSION,
    Q8_BENCHMARK_METRICS,
)

DIALECT = postgresql.dialect(paramstyle="pyformat")


def exec_sql(cur, query, params=None):
    if hasattr(query, "compile"):
        sql_str = str(query.compile(dialect=DIALECT))
    else:
        sql_str = str(query)
    cur.execute(sql_str, params)
    return cur


def test_pgvector_version(db_conn):
    with db_conn.cursor() as cur:
        exec_sql(cur, Q7_PGVECTOR_VERSION)
        row = cur.fetchone()
        assert row is not None, "pgvector extension not installed"
        version_str = row[0]
        # Version must be >= 0.7.0
        parts = [int(p) for p in version_str.split(".")[:3]]
        assert parts >= [0, 7, 0], f"pgvector version {version_str} is older than 0.7.0"


def test_migration_cycle(migrated_db):
    # migrated_db fixture runs alembic downgrade base and upgrade head cycle
    assert migrated_db is not None


def test_column_types(db_conn, clean_db):
    query = """
    SELECT attname, format_type(atttypid, atttypmod)
    FROM pg_attribute
    WHERE attrelid = 'images'::regclass
      AND attname IN ('phash', 'dhash', 'ahash', 'whash', 'clip_emb', 'dino_emb');
    """
    with db_conn.cursor() as cur:
        cur.execute(query)
        col_types = dict(cur.fetchall())

    for col in ("phash", "dhash", "ahash", "whash"):
        assert col_types.get(col) == "bit(64)", f"{col} has type {col_types.get(col)}, expected bit(64)"

    assert col_types.get("clip_emb") == "vector(512)", (
        f"clip_emb has type {col_types.get('clip_emb')}, expected vector(512)"
    )
    assert col_types.get("dino_emb") == "vector(768)", (
        f"dino_emb has type {col_types.get('dino_emb')}, expected vector(768)"
    )


def test_index_definitions(db_conn, clean_db):
    query = """
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'images'
      AND indexname IN ('images_phash_hnsw', 'images_clip_hnsw', 'images_dino_hnsw');
    """
    with db_conn.cursor() as cur:
        cur.execute(query)
        indexes = dict(cur.fetchall())

    assert "images_phash_hnsw" in indexes
    assert "hnsw" in indexes["images_phash_hnsw"]
    assert "bit_hamming_ops" in indexes["images_phash_hnsw"]

    assert "images_clip_hnsw" in indexes
    assert "vector_cosine_ops" in indexes["images_clip_hnsw"]

    assert "images_dino_hnsw" in indexes
    assert "vector_cosine_ops" in indexes["images_dino_hnsw"]


def test_hamming_distance_equivalence(db_conn, clean_db):
    # Insert 2 images rows with hand-made hashes (64 zeros vs. 8 ones + 56 zeros) and random unit vectors
    hash_zeros = "0" * 64
    hash_8ones = "1" * 8 + "0" * 56
    query_hash = "1" * 8 + "0" * 56

    rng = np.random.default_rng(42)
    clip1 = rng.standard_normal(512)
    clip1 = (clip1 / np.linalg.norm(clip1)).tolist()
    dino1 = rng.standard_normal(768)
    dino1 = (dino1 / np.linalg.norm(dino1)).tolist()

    clip2 = rng.standard_normal(512)
    clip2 = (clip2 / np.linalg.norm(clip2)).tolist()
    dino2 = rng.standard_normal(768)
    dino2 = (dino2 / np.linalg.norm(dino2)).tolist()

    insert_sql = """
    INSERT INTO images (
        file_path, source_format, sha256, width, height,
        phash, dhash, ahash, whash, low_detail,
        clip_emb, dino_emb, clip_model, dino_model, config_version
    ) VALUES (%s, %s, %s, %s, %s, %s::bit(64), %s::bit(64), %s::bit(64), %s::bit(64), %s, %s::vector, %s::vector, %s, %s, %s)
    """

    with db_conn.cursor() as cur:
        cur.execute(
            insert_sql,
            (
                "img1.jpg",
                "JPEG",
                "a" * 64,
                100,
                100,
                hash_zeros,
                hash_zeros,
                hash_zeros,
                hash_zeros,
                False,
                str(clip1),
                str(dino1),
                "clip",
                "dino",
                "1.0",
            ),
        )
        cur.execute(
            insert_sql,
            (
                "img2.jpg",
                "JPEG",
                "b" * 64,
                100,
                100,
                hash_8ones,
                hash_8ones,
                hash_8ones,
                hash_8ones,
                False,
                str(clip2),
                str(dino2),
                "clip",
                "dino",
                "1.0",
            ),
        )

        # Test distance between row 1 (64 zeros) and query_hash (8 ones + 56 zeros)
        cur.execute(
            "SELECT phash <~> %s::bit(64), bit_count(phash # %s::bit(64)) FROM images WHERE sha256 = %s",
            (query_hash, query_hash, "a" * 64),
        )
        row = cur.fetchone()
        d_operator, d_bitcount = row[0], row[1]

        # Python calculation
        val_a = int(hash_zeros, 2)
        val_q = int(query_hash, 2)
        py_dist = bin(val_a ^ val_q).count("1")  # noqa: FURB161

        assert d_operator == 8
        assert d_bitcount == 8
        assert py_dist == 8


def test_q2_and_q3_execution(db_conn, clean_db):
    rng = np.random.default_rng(123)
    insert_sql = """
    INSERT INTO images (
        file_path, source_format, sha256, width, height,
        phash, dhash, ahash, whash, low_detail,
        clip_emb, dino_emb, clip_model, dino_model, config_version
    ) VALUES (%s, %s, %s, %s, %s, %s::bit(64), %s::bit(64), %s::bit(64), %s::bit(64), %s, %s::vector, %s::vector, %s, %s, %s)
    """

    dino_vecs = []
    with db_conn.cursor() as cur:
        for i in range(10):
            h = format(i, "064b")
            c = rng.standard_normal(512)
            c = (c / np.linalg.norm(c)).tolist()
            d = rng.standard_normal(768)
            d = d / np.linalg.norm(d)
            dino_vecs.append(d)
            cur.execute(
                insert_sql,
                (
                    f"img_{i}.jpg",
                    "PNG",
                    f"{i:064x}",
                    200,
                    200,
                    h,
                    h,
                    h,
                    h,
                    False,
                    str(c),
                    str(d.tolist()),
                    "clip",
                    "dino",
                    "1.0",
                ),
            )

        # Query Q2
        query_hash = format(0, "064b")
        exec_sql(
            cur,
            Q2_STAGE1,
            {"phash": query_hash, "dhash": query_hash, "ahash": query_hash, "whash": query_hash, "k": 5},
        )
        rows_q2 = cur.fetchall()
        assert len(rows_q2) == 5
        # Verify ordered by d_phash
        distances = [r[4] for r in rows_q2]
        assert distances == sorted(distances)

        # Query Q3
        target_dino = dino_vecs[0]
        dummy_clip = rng.standard_normal(512)
        dummy_clip = (dummy_clip / np.linalg.norm(dummy_clip)).tolist()
        exec_sql(
            cur,
            Q3_STAGE2,
            {
                "phash": query_hash,
                "dhash": query_hash,
                "ahash": query_hash,
                "whash": query_hash,
                "dino": str(target_dino.tolist()),
                "clip": str(dummy_clip),
                "k": 5,
            },
        )
        rows_q3 = cur.fetchall()
        assert len(rows_q3) == 5
        # cos_dino is column index 8 (id, owner_name, registered_at, low_detail, d_phash, d_dhash, d_ahash, d_whash, cos_dino, cos_clip)
        cos_dino_sql = rows_q3[0][8]
        expected_cos = float(np.dot(target_dino, target_dino))  # should be 1.0
        assert np.isclose(cos_dino_sql, expected_cos, atol=1e-5)


def test_q4_conflict(db_conn, clean_db):
    rng = np.random.default_rng(999)
    dino1 = rng.standard_normal(768)
    dino1 = (dino1 / np.linalg.norm(dino1)).tolist()
    clip1 = rng.standard_normal(512)
    clip1 = (clip1 / np.linalg.norm(clip1)).tolist()

    insert_sql = """
    INSERT INTO images (
        file_path, source_format, sha256, width, height,
        phash, dhash, ahash, whash, low_detail,
        clip_emb, dino_emb, clip_model, dino_model, config_version
    ) VALUES (%s, %s, %s, %s, %s, %s::bit(64), %s::bit(64), %s::bit(64), %s::bit(64), %s, %s::vector, %s::vector, %s, %s, %s)
    """

    with db_conn.cursor() as cur:
        cur.execute(
            insert_sql,
            (
                "img_conflict.jpg",
                "JPEG",
                "1" * 64,
                100,
                100,
                "0" * 64,
                "0" * 64,
                "0" * 64,
                "0" * 64,
                False,
                str(clip1),
                str(dino1),
                "clip",
                "dino",
                "1.0",
            ),
        )

        dummy_dino = str((np.ones(768) / np.linalg.norm(np.ones(768))).tolist())
        dummy_clip = str((np.ones(512) / np.linalg.norm(np.ones(512))).tolist())

        # 1. Identical sha -> reason 'sha256'
        exec_sql(
            cur,
            Q4_CONFLICT,
            {
                "sha": "1" * 64,
                "low": False,
                "phash": "1" * 64,
                "dhash": "1" * 64,
                "ahash": "1" * 64,
                "whash": "1" * 64,
                "hmax": 10,
                "dino": dummy_dino,
                "clip": dummy_clip,
                "cmin": 0.9,
            },
        )
        row = cur.fetchone()
        assert row is not None
        assert row[2] == "sha256"

        # 2. pHash distance 6 with low=false -> 'hash' (query hash differs by 6 bits from '0'*64)
        query_hash_6 = "1" * 6 + "0" * 58
        exec_sql(
            cur,
            Q4_CONFLICT,
            {
                "sha": "2" * 64,
                "low": False,
                "phash": query_hash_6,
                "dhash": query_hash_6,
                "ahash": query_hash_6,
                "whash": query_hash_6,
                "hmax": 10,
                "dino": dummy_dino,
                "clip": dummy_clip,
                "cmin": 0.9,
            },
        )
        row = cur.fetchone()
        assert row is not None
        assert row[2] == "hash"

        # 3. Same with low=true and dino cosine 0.99 -> 'dino_cosine'
        # Pass exact dino vector so cosine sim = 1.0 >= 0.99
        exec_sql(
            cur,
            Q4_CONFLICT,
            {
                "sha": "2" * 64,
                "low": True,
                "phash": query_hash_6,
                "dhash": query_hash_6,
                "ahash": query_hash_6,
                "whash": query_hash_6,
                "hmax": 10,
                "dino": str(dino1),
                "clip": str(clip1),
                "cmin": 0.9,
            },
        )
        row = cur.fetchone()
        assert row is not None
        assert row[2] == "dino_cosine"

        # 4. Unrelated -> no row
        unrelated_hash = "1" * 64
        exec_sql(
            cur,
            Q4_CONFLICT,
            {
                "sha": "3" * 64,
                "low": False,
                "phash": unrelated_hash,
                "dhash": unrelated_hash,
                "ahash": unrelated_hash,
                "whash": unrelated_hash,
                "hmax": 10,
                "dino": dummy_dino,
                "clip": dummy_clip,
                "cmin": 0.99,
            },
        )
        row = cur.fetchone()
        assert row is None


def test_duplicate_sha256_raises_unique_violation(db_conn, clean_db):
    rng = np.random.default_rng(7)
    clip = (rng.standard_normal(512) / 10).tolist()
    dino = (rng.standard_normal(768) / 10).tolist()

    insert_sql = """
    INSERT INTO images (
        file_path, source_format, sha256, width, height,
        phash, dhash, ahash, whash, low_detail,
        clip_emb, dino_emb, clip_model, dino_model, config_version
    ) VALUES (%s, %s, %s, %s, %s, %s::bit(64), %s::bit(64), %s::bit(64), %s::bit(64), %s, %s::vector, %s::vector, %s, %s, %s)
    """

    with db_conn.cursor() as cur:
        cur.execute(
            insert_sql,
            (
                "img_unique1.jpg",
                "JPEG",
                "d" * 64,
                100,
                100,
                "0" * 64,
                "0" * 64,
                "0" * 64,
                "0" * 64,
                False,
                str(clip),
                str(dino),
                "clip",
                "dino",
                "1.0",
            ),
        )
        with pytest.raises(UniqueViolation):
            cur.execute(
                insert_sql,
                (
                    "img_unique2.jpg",
                    "JPEG",
                    "d" * 64,
                    100,
                    100,
                    "0" * 64,
                    "0" * 64,
                    "0" * 64,
                    "0" * 64,
                    False,
                    str(clip),
                    str(dino),
                    "clip",
                    "dino",
                    "1.0",
                ),
            )


def test_explain_index_usage(db_conn, clean_db):
    with db_conn.cursor() as cur:
        cur.execute("SET enable_seqscan = off")

        # Explain Q2
        query_hash = "0" * 64
        q2_sql = str(Q2_STAGE1.compile(dialect=DIALECT))
        cur.execute(
            f"EXPLAIN {q2_sql}",
            {"phash": query_hash, "dhash": query_hash, "ahash": query_hash, "whash": query_hash, "k": 5},
        )
        explain_q2 = " ".join(r[0] for r in cur.fetchall())
        assert "images_phash_hnsw" in explain_q2

        # Explain Q3
        dummy_dino = str((np.ones(768) / np.linalg.norm(np.ones(768))).tolist())
        dummy_clip = str((np.ones(512) / np.linalg.norm(np.ones(512))).tolist())
        q3_sql = str(Q3_STAGE2.compile(dialect=DIALECT))
        cur.execute(
            f"EXPLAIN {q3_sql}",
            {
                "phash": query_hash,
                "dhash": query_hash,
                "ahash": query_hash,
                "whash": query_hash,
                "dino": dummy_dino,
                "clip": dummy_clip,
                "k": 5,
            },
        )
        explain_q3 = " ".join(r[0] for r in cur.fetchall())
        assert "images_dino_hnsw" in explain_q3


def test_relrowsecurity_enabled(db_conn, clean_db):
    query = """
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relname IN ('images', 'verifications', 'benchmark_runs', 'benchmark_metrics');
    """
    with db_conn.cursor() as cur:
        cur.execute(query)
        rls_map = dict(cur.fetchall())

    for table in ("images", "verifications", "benchmark_runs", "benchmark_metrics"):
        assert rls_map.get(table) is True, f"RLS is not enabled for table {table}"


def test_invalid_decided_by_raises_check_violation(db_conn, clean_db):
    insert_sql = """
    INSERT INTO verifications (
        query_sha256, query_width, query_height, low_detail, decided_by,
        stages, candidates, config_version, latency_ms
    ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s)
    """
    with db_conn.cursor() as cur, pytest.raises(CheckViolation):
        cur.execute(
            insert_sql,
            ("e" * 64, 100, 100, False, "maybe", "{}", "[]", "1.0", 10),
        )


def test_additional_sql_queries(db_conn, clean_db):
    # Test Q1_EXACT, Q5_REGISTER_LOCK, Q6_EF_SEARCH, Q7_IMAGE_COUNT, Q8_BENCHMARK_METRICS
    with db_conn.cursor() as cur:
        # Q6
        exec_sql(cur, Q6_EF_SEARCH)

        # Q5
        exec_sql(cur, Q5_REGISTER_LOCK)

        # Q7_IMAGE_COUNT
        exec_sql(cur, Q7_IMAGE_COUNT)
        count = cur.fetchone()[0]
        assert count == 0

        # Q1_EXACT
        exec_sql(cur, Q1_EXACT, {"sha": "nonexistent"})
        assert cur.fetchone() is None

        # Insert a benchmark metric and run
        cur.execute("""
        INSERT INTO benchmark_runs (
            run_id, split, category, original_id, query_file,
            is_true_copy, method, score, score_kind, latency_ms
        ) VALUES ('run1', 'tune', 'catA', 'orig1', 'q1.jpg', true, 'phash', 0.0, 'hamming', 1.5);
        """)
        cur.execute("""
        INSERT INTO benchmark_metrics (
            run_id, method, category, transform, strength, n_pairs
        ) VALUES ('run1', 'phash', 'catA', 'all', 'all', 10);
        """)

        # Q8 with explicit run_id
        exec_sql(cur, Q8_BENCHMARK_METRICS, {"run_id": "run1"})
        rows = cur.fetchall()
        assert len(rows) == 1
        assert rows[0][0] == "run1"

        # Q8 with null run_id (fallback to subquery)
        exec_sql(cur, Q8_BENCHMARK_METRICS, {"run_id": None})
        rows_fallback = cur.fetchall()
        assert len(rows_fallback) == 1
        assert rows_fallback[0][0] == "run1"


def test_guard_test_database_remote_exits():
    from tests.conftest import guard_test_database

    with pytest.raises(pytest.exit.Exception, match="Refusing to run destructive tests on a remote database"):
        guard_test_database("postgresql://user:pass@example.supabase.co:5432/postgres")


def test_guard_test_database_allows_local_and_override(monkeypatch):
    from tests.conftest import guard_test_database

    for host in ("localhost", "127.0.0.1", "db"):
        guard_test_database(f"postgresql://user:pass@{host}:5432/provnet")

    monkeypatch.setenv("PROVNET_ALLOW_REMOTE_TEST_DB", "1")
    guard_test_database("postgresql://user:pass@example.supabase.co:5432/postgres")
