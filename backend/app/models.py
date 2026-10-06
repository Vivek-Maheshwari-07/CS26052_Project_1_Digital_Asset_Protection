import uuid
from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector as _BaseVector
from sqlalchemy import (
    CHAR,
    REAL,
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.types import Hash64


class Vector(_BaseVector):
    cache_ok = True

    def bind_processor(self, dialect):
        if dialect and dialect.driver == "asyncpg":
            return lambda value: value if value is None else (value if isinstance(value, (list, tuple)) else list(value))
        return super().bind_processor(dialect)


class Base(DeclarativeBase):
    pass


class Image(Base):
    __tablename__ = "images"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    owner_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_filename: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    source_format: Mapped[str] = mapped_column(Text, nullable=False)
    sha256: Mapped[str] = mapped_column(CHAR(64), nullable=False, unique=True)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    phash: Mapped[str] = mapped_column(Hash64, nullable=False)
    dhash: Mapped[str] = mapped_column(Hash64, nullable=False)
    ahash: Mapped[str] = mapped_column(Hash64, nullable=False)
    whash: Mapped[str] = mapped_column(Hash64, nullable=False)
    low_detail: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
        default=False,
    )
    clip_emb: Mapped[list[float]] = mapped_column(Vector(512), nullable=False)
    dino_emb: Mapped[list[float]] = mapped_column(Vector(768), nullable=False)
    clip_model: Mapped[str] = mapped_column(Text, nullable=False)
    dino_model: Mapped[str] = mapped_column(Text, nullable=False)
    config_version: Mapped[str] = mapped_column(Text, nullable=False)
    registered_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint("char_length(owner_name) <= 100", name="images_owner_name_check"),
        CheckConstraint("source_format IN ('JPEG','PNG','WEBP')", name="images_source_format_check"),
        CheckConstraint("width > 0", name="images_width_check"),
        CheckConstraint("height > 0", name="images_height_check"),
        Index(
            "images_phash_hnsw",
            "phash",
            postgresql_using="hnsw",
            postgresql_ops={"phash": "bit_hamming_ops"},
        ),
        Index(
            "images_clip_hnsw",
            "clip_emb",
            postgresql_using="hnsw",
            postgresql_ops={"clip_emb": "vector_cosine_ops"},
        ),
        Index(
            "images_dino_hnsw",
            "dino_emb",
            postgresql_using="hnsw",
            postgresql_ops={"dino_emb": "vector_cosine_ops"},
        ),
        Index("images_registered_at", "registered_at"),
    )


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    query_sha256: Mapped[str] = mapped_column(CHAR(64), nullable=False)
    query_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    query_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    low_detail: Mapped[bool] = mapped_column(Boolean, nullable=False)
    decided_by: Mapped[str] = mapped_column(Text, nullable=False)
    top_match: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("images.id", ondelete="SET NULL"),
        nullable=True,
    )
    stages: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    candidates: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    config_version: Mapped[str] = mapped_column(Text, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint("decided_by IN ('sha256','hash','embedding','none')", name="verifications_decided_by_check"),
        CheckConstraint("latency_ms >= 0", name="verifications_latency_ms_check"),
        Index("verifications_created_at", "created_at"),
        Index("verifications_top_match", "top_match"),
    )


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(Text, nullable=False)
    split: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    original_id: Mapped[str] = mapped_column(Text, nullable=False)
    query_file: Mapped[str] = mapped_column(Text, nullable=False)
    transform: Mapped[str | None] = mapped_column(Text, nullable=True)
    strength: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_true_copy: Mapped[bool] = mapped_column(Boolean, nullable=False)
    method: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[float] = mapped_column(REAL, nullable=False)
    score_kind: Mapped[str] = mapped_column(Text, nullable=False)
    latency_ms: Mapped[float] = mapped_column(REAL, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("run_id", "query_file", "original_id", "method", name="benchmark_runs_run_id_query_file_original_id_method_key"),
        CheckConstraint("split IN ('tune','test')", name="benchmark_runs_split_check"),
        CheckConstraint(
            "method IN ('phash','dhash','ahash','whash','clip','dino','noise_residual','cascade')",
            name="benchmark_runs_method_check",
        ),
        CheckConstraint("score_kind IN ('hamming','cosine','ratio','decision')", name="benchmark_runs_score_kind_check"),
        Index("benchmark_runs_lookup", "run_id", "method", "category"),
    )


class BenchmarkMetric(Base):
    __tablename__ = "benchmark_metrics"

    run_id: Mapped[str] = mapped_column(Text, primary_key=True)
    method: Mapped[str] = mapped_column(Text, primary_key=True)
    category: Mapped[str] = mapped_column(Text, primary_key=True)
    transform: Mapped[str] = mapped_column(Text, primary_key=True, server_default=text("'all'"))
    strength: Mapped[str] = mapped_column(Text, primary_key=True, server_default=text("'all'"))
    threshold: Mapped[float | None] = mapped_column(REAL, nullable=True)
    precision: Mapped[float | None] = mapped_column(REAL, nullable=True)
    recall: Mapped[float | None] = mapped_column(REAL, nullable=True)
    f1: Mapped[float | None] = mapped_column(REAL, nullable=True)
    accuracy: Mapped[float | None] = mapped_column(REAL, nullable=True)
    roc_auc: Mapped[float | None] = mapped_column(REAL, nullable=True)
    median_latency_ms: Mapped[float | None] = mapped_column(REAL, nullable=True)
    n_pairs: Mapped[int] = mapped_column(Integer, nullable=False)
