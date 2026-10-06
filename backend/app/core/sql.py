from sqlalchemy import text

Q1_EXACT = text("""
SELECT id FROM images WHERE sha256 = :sha LIMIT 1
""")

Q2_STAGE1 = text("""
SELECT id, owner_name, registered_at, low_detail,
       phash <~> CAST(:phash AS bit(64)) AS d_phash,
       dhash <~> CAST(:dhash AS bit(64)) AS d_dhash,
       ahash <~> CAST(:ahash AS bit(64)) AS d_ahash,
       whash <~> CAST(:whash AS bit(64)) AS d_whash
FROM images
ORDER BY phash <~> CAST(:phash AS bit(64))
LIMIT :k
""")

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
""")

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
""")

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

Q8_BENCHMARK_METRICS = text("""
SELECT * FROM benchmark_metrics
WHERE run_id = COALESCE(:run_id, (SELECT run_id FROM benchmark_runs ORDER BY created_at DESC LIMIT 1))
ORDER BY method, category, transform, strength
""")
