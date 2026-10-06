"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-10-06 10:00:00.000000

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name TEXT CHECK (char_length(owner_name) <= 100),
  original_filename TEXT,
  file_path TEXT NOT NULL UNIQUE,
  source_format TEXT NOT NULL CHECK (source_format IN ('JPEG','PNG','WEBP')),
  sha256 CHAR(64) NOT NULL UNIQUE,
  width INT NOT NULL CHECK (width > 0),
  height INT NOT NULL CHECK (height > 0),
  phash BIT(64) NOT NULL, dhash BIT(64) NOT NULL, ahash BIT(64) NOT NULL, whash BIT(64) NOT NULL,
  low_detail BOOLEAN NOT NULL DEFAULT FALSE,
  clip_emb VECTOR(512) NOT NULL,
  dino_emb VECTOR(768) NOT NULL,
  clip_model TEXT NOT NULL, dino_model TEXT NOT NULL, config_version TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX images_phash_hnsw ON images USING hnsw (phash bit_hamming_ops);
CREATE INDEX images_clip_hnsw  ON images USING hnsw (clip_emb vector_cosine_ops);
CREATE INDEX images_dino_hnsw  ON images USING hnsw (dino_emb vector_cosine_ops);
CREATE INDEX images_registered_at ON images (registered_at);

CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_sha256 CHAR(64) NOT NULL,
  query_width INT, query_height INT,
  low_detail BOOLEAN NOT NULL,
  decided_by TEXT NOT NULL CHECK (decided_by IN ('sha256','hash','embedding','none')),
  top_match UUID REFERENCES images(id) ON DELETE SET NULL,
  stages JSONB NOT NULL, candidates JSONB NOT NULL,
  config_version TEXT NOT NULL,
  latency_ms INT NOT NULL CHECK (latency_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX verifications_created_at ON verifications (created_at);
CREATE INDEX verifications_top_match ON verifications (top_match);

CREATE TABLE benchmark_runs (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  split TEXT NOT NULL CHECK (split IN ('tune','test')),
  category TEXT NOT NULL, original_id TEXT NOT NULL, query_file TEXT NOT NULL,
  transform TEXT, strength TEXT,
  is_true_copy BOOLEAN NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('phash','dhash','ahash','whash','clip','dino','noise_residual','cascade')),
  score REAL NOT NULL,
  score_kind TEXT NOT NULL CHECK (score_kind IN ('hamming','cosine','ratio','decision')),
  latency_ms REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, query_file, original_id, method)
);
CREATE INDEX benchmark_runs_lookup ON benchmark_runs (run_id, method, category);

CREATE TABLE benchmark_metrics (
  run_id TEXT NOT NULL, method TEXT NOT NULL, category TEXT NOT NULL,
  transform TEXT NOT NULL DEFAULT 'all', strength TEXT NOT NULL DEFAULT 'all',
  threshold REAL, precision REAL, recall REAL, f1 REAL, accuracy REAL, roc_auc REAL,
  median_latency_ms REAL, n_pairs INT NOT NULL,
  PRIMARY KEY (run_id, method, category, transform, strength)
);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_metrics ENABLE ROW LEVEL SECURITY;
""")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS benchmark_metrics;")
    op.execute("DROP TABLE IF EXISTS benchmark_runs;")
    op.execute("DROP TABLE IF EXISTS verifications;")
    op.execute("DROP TABLE IF EXISTS images;")
