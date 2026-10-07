from sqlalchemy import Boolean, Float, Integer, String, bindparam, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.models import Vector
from app.types import Hash64

Q1_EXACT = text("""
SELECT id FROM images WHERE sha256 = :sha LIMIT 1
""").bindparams(
    bindparam("sha", type_=String),
)

Q2_STAGE1 = text("""
SELECT id, owner_name, registered_at, low_detail,
       phash <~> CAST(:phash AS bit(64)) AS d_phash,
       dhash <~> CAST(:dhash AS bit(64)) AS d_dhash,
       ahash <~> CAST(:ahash AS bit(64)) AS d_ahash,
       whash <~> CAST(:whash AS bit(64)) AS d_whash
FROM images
ORDER BY phash <~> CAST(:phash AS bit(64))
LIMIT :k
""").bindparams(
    bindparam("phash", type_=Hash64),
    bindparam("dhash", type_=Hash64),
    bindparam("ahash", type_=Hash64),
    bindparam("whash", type_=Hash64),
    bindparam("k", type_=Integer),
)

Q3_STAGE2 = text("""
SELECT id, owner_name, registered_at, low_detail,
       phash <~> CAST(:phash AS bit(64)) AS d_phash,
       dhash <~> CAST(:dhash AS bit(64)) AS d_dhash,
       ahash <~> CAST(:ahash AS bit(64)) AS d_ahash,
       whash <~> CAST(:whash AS bit(64)) AS d_whash,
       1 - (dino_emb <=> CAST(:dino AS vector(768))) AS cos_dino,
       1 - (clip_emb <=> CAST(:clip AS vector(512))) AS cos_clip
FROM images
ORDER BY dino_emb <=> CAST(:dino AS vector(768))
LIMIT :k
""").bindparams(
    bindparam("phash", type_=Hash64),
    bindparam("dhash", type_=Hash64),
    bindparam("ahash", type_=Hash64),
    bindparam("whash", type_=Hash64),
    bindparam("dino", type_=Vector(768)),
    bindparam("clip", type_=Vector(512)),
    bindparam("k", type_=Integer),
)

Q4_CONFLICT = text("""
SELECT id, registered_at,
       CASE WHEN sha256 = :sha THEN 'sha256'
            WHEN NOT :low AND NOT low_detail AND (phash <~> CAST(:phash AS bit(64))) <= :hmax THEN 'hash'
            ELSE 'dino_cosine' END AS reason,
       phash <~> CAST(:phash AS bit(64)) AS d_phash,
       dhash <~> CAST(:dhash AS bit(64)) AS d_dhash,
       ahash <~> CAST(:ahash AS bit(64)) AS d_ahash,
       whash <~> CAST(:whash AS bit(64)) AS d_whash,
       1 - (dino_emb <=> CAST(:dino AS vector(768))) AS cos_dino,
       1 - (clip_emb <=> CAST(:clip AS vector(512))) AS cos_clip
FROM images
WHERE sha256 = :sha
   OR (NOT :low AND NOT low_detail AND (phash <~> CAST(:phash AS bit(64))) <= :hmax)
   OR (1 - (dino_emb <=> CAST(:dino AS vector(768)))) >= :cmin
ORDER BY (sha256 = :sha) DESC, cos_dino DESC
LIMIT 1
""").bindparams(
    bindparam("sha", type_=String),
    bindparam("low", type_=Boolean),
    bindparam("phash", type_=Hash64),
    bindparam("dhash", type_=Hash64),
    bindparam("ahash", type_=Hash64),
    bindparam("whash", type_=Hash64),
    bindparam("hmax", type_=Integer),
    bindparam("dino", type_=Vector(768)),
    bindparam("clip", type_=Vector(512)),
    bindparam("cmin", type_=Float),
)

Q5_REGISTER_LOCK = text("""
SELECT pg_advisory_xact_lock(hashtext('provnet:register'))
""")

Q6_EF_SEARCH = text("""
SET LOCAL hnsw.ef_search = 100
""")

Q7_PGVECTOR_VERSION = text("""
SELECT extversion FROM pg_extension WHERE extname = 'vector'
""")

Q7_IMAGE_COUNT = text("""
SELECT count(*) FROM images
""")

Q9_HAMMING_BY_ID = text("""
SELECT id, owner_name, registered_at, low_detail,
       phash <~> CAST(:phash AS bit(64)) AS d_phash,
       dhash <~> CAST(:dhash AS bit(64)) AS d_dhash,
       ahash <~> CAST(:ahash AS bit(64)) AS d_ahash,
       whash <~> CAST(:whash AS bit(64)) AS d_whash
FROM images
WHERE id = :id
""").bindparams(
    bindparam("phash", type_=Hash64),
    bindparam("dhash", type_=Hash64),
    bindparam("ahash", type_=Hash64),
    bindparam("whash", type_=Hash64),
    bindparam("id", type_=PGUUID(as_uuid=True)),
)

Q10_COSINE_FOR_IDS = text("""
SELECT id,
       1 - (dino_emb <=> CAST(:dino AS vector(768))) AS cos_dino,
       1 - (clip_emb <=> CAST(:clip AS vector(512))) AS cos_clip
FROM images
WHERE id = ANY(:ids)
""").bindparams(
    bindparam("dino", type_=Vector(768)),
    bindparam("clip", type_=Vector(512)),
    bindparam("ids", type_=ARRAY(PGUUID(as_uuid=True))),
)

Q8_BENCHMARK_METRICS = text("""
SELECT * FROM benchmark_metrics
WHERE run_id = COALESCE(:run_id, (SELECT run_id FROM benchmark_runs ORDER BY created_at DESC LIMIT 1))
ORDER BY method, category, transform, strength
""").bindparams(
    bindparam("run_id", type_=String),
)

Q11_BENCHMARK_RUNS_LIST = text("""
SELECT 
    run_id,
    MAX(created_at) AS created_at,
    COUNT(*)::integer AS n_rows,
    ARRAY_AGG(DISTINCT split ORDER BY split) AS splits
FROM benchmark_runs
GROUP BY run_id
ORDER BY MAX(created_at) DESC
""")

Q12_BENCHMARK_RUN_EXISTS = text("""
SELECT run_id 
FROM benchmark_runs 
WHERE run_id = :run_id 
LIMIT 1
""").bindparams(
    bindparam("run_id", type_=String),
)

Q13_BENCHMARK_LATEST_RUN_ID = text("""
SELECT run_id 
FROM benchmark_runs 
ORDER BY created_at DESC 
LIMIT 1
""")

Q14_BENCHMARK_SUMMARY_COUNTS = text("""
SELECT 
    COUNT(DISTINCT original_id)::integer AS n_originals,
    COUNT(DISTINCT split_part(query_file, '__', 1)) FILTER (WHERE category = 'hard_negative')::integer AS n_hard_negatives
FROM benchmark_runs
WHERE run_id = :run_id
""").bindparams(
    bindparam("run_id", type_=String),
)

Q15_BENCHMARK_CASCADE_STATS = text("""
-- Rule: A query escalated iff its cascade latency_ms > its phash latency_ms for the same
-- (query_file, original_id), because evaluate.py stores cascade_lat = hash_lat when it does not escalate.
SELECT 
    COALESCE(AVG(c.latency_ms), 0.0)::float AS mean_latency_ms,
    COALESCE(
        COUNT(*) FILTER (WHERE c.latency_ms > p.latency_ms)::float / NULLIF(COUNT(*), 0),
        0.0
    )::float AS escalation_rate
FROM benchmark_runs c
JOIN benchmark_runs p ON c.run_id = p.run_id 
    AND c.query_file = p.query_file 
    AND c.original_id = p.original_id 
    AND p.method = 'phash'
WHERE c.run_id = :run_id 
  AND c.method = 'cascade' 
  AND c.split = 'test'
""").bindparams(
    bindparam("run_id", type_=String),
)

Q16_BENCHMARK_STREAM_RUNS = text("""
SELECT 
    run_id, split, category, original_id, query_file, transform, strength,
    is_true_copy, method, score, score_kind, latency_ms, created_at
FROM benchmark_runs
WHERE run_id = :run_id
ORDER BY id
""").bindparams(
    bindparam("run_id", type_=String),
)

