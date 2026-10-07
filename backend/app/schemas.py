from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, StringConstraints

HexHash = Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{16}$")]
Sha256 = Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{64}$")]


def serialize_utc_datetime(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    else:
        dt = dt.astimezone(UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


UtcDatetime = Annotated[datetime, PlainSerializer(serialize_utc_datetime, return_type=str)]


class Fingerprints(BaseModel):
    model_config = ConfigDict(extra="forbid")
    phash: HexHash
    dhash: HexHash
    ahash: HexHash
    whash: HexHash


class ModelsInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    clip: str
    dino: str
    config_version: str


class RegisterResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    image_id: UUID
    owner_name: Annotated[str | None, StringConstraints(max_length=100)] = None
    registered_at: UtcDatetime
    sha256: Sha256
    width: int
    height: int
    low_detail: bool
    fingerprints: Fingerprints
    models: ModelsInfo
    record_url: str


class HammingScores(BaseModel):
    model_config = ConfigDict(extra="forbid")
    phash: int = Field(ge=0, le=64)
    dhash: int = Field(ge=0, le=64)
    ahash: int = Field(ge=0, le=64)
    whash: int = Field(ge=0, le=64)


class CosineScores(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dino: float | None
    clip: float | None


class ExistingMatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    image_id: UUID
    registered_at: UtcDatetime
    thumbnail_url: str
    hamming: HammingScores
    cosine: CosineScores


class ConflictThresholds(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hamming_conflict_max: int
    dino_cosine_conflict_min: float


class ConflictResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    error: Literal["near_duplicate"] = "near_duplicate"
    reason: Literal["sha256", "hash", "dino_cosine"]
    message: str
    existing: ExistingMatch
    thresholds: ConflictThresholds


class QueryInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sha256: Sha256
    width: int | None = None
    height: int | None = None
    low_detail: bool


class Sha256Stage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage: Literal["sha256"] = "sha256"
    hit: bool
    latency_ms: int


class HashStage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage: Literal["hash"] = "hash"
    best_phash_hamming: int | None
    confident: bool
    latency_ms: int


class EmbeddingStage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage: Literal["embedding"] = "embedding"
    best_dino_cosine: float | None
    passed: bool
    latency_ms: int


Stage = Annotated[Sha256Stage | HashStage | EmbeddingStage, Field(discriminator="stage")]


class AboveThreshold(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hash: bool
    dino: bool | None


class Candidate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rank: int
    image_id: UUID
    owner_name: Annotated[str | None, StringConstraints(max_length=100)] = None
    registered_at: UtcDatetime
    thumbnail_url: str
    hamming: HammingScores
    cosine: CosineScores
    above_threshold: AboveThreshold


class EvidenceThresholds(BaseModel):
    model_config = ConfigDict(extra="forbid")
    phash: int | None = None
    dhash: int | None = None
    ahash: int | None = None
    whash: int | None = None
    dino: float | None = None
    clip: float | None = None


class VerifyThresholds(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hamming_confident_max: int
    dino_cosine_match_min: float
    evidence: EvidenceThresholds | None = None


class VerifyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verification_id: UUID
    decided_by: Literal["sha256", "hash", "embedding", "none"]
    verdict: Literal["match", "no_match"]
    query: QueryInfo
    thresholds: VerifyThresholds
    config_version: str
    stages: list[Stage]
    candidates: list[Candidate] = Field(max_length=5)
    latency_ms: int


class ImageDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")
    image_id: UUID
    owner_name: Annotated[str | None, StringConstraints(max_length=100)] = None
    registered_at: UtcDatetime
    sha256: Sha256
    width: int
    height: int
    source_format: str
    low_detail: bool
    fingerprints: Fingerprints
    models: ModelsInfo
    file_url: str
    record_url: str


class DeepAboveThreshold(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dino: bool
    clip: bool


class DeepCandidate(BaseModel):
    """Lazily computed deep scores for one candidate of an earlier verification."""

    model_config = ConfigDict(extra="forbid")
    rank: int
    image_id: UUID
    cosine: CosineScores
    above_threshold: DeepAboveThreshold


class DeepVerifyResponse(BaseModel):
    """Deep cosine scores for the Evidence View. Never changes the stored verdict."""

    model_config = ConfigDict(extra="forbid")
    verification_id: UUID
    decided_by: Literal["sha256", "hash", "embedding", "none"]
    query_sha256: Sha256
    thresholds: EvidenceThresholds
    candidates: list[DeepCandidate] = Field(max_length=5)
    embedding_latency_ms: int | None
    latency_ms: int


class RegistrationRecord(BaseModel):
    """Timestamped fingerprint receipt. Not a provenance or copyright certificate."""

    model_config = ConfigDict(extra="forbid")
    record_type: Literal["provnet.registration_record"] = "provnet.registration_record"
    record_version: Literal["1"] = "1"
    image_id: UUID
    owner_name: Annotated[str | None, StringConstraints(max_length=100)] = None
    owner_name_verified: Literal[False] = False
    registered_at: UtcDatetime
    issued_at: UtcDatetime
    sha256: Sha256
    sha256_scope: Literal["original_upload_bytes"] = "original_upload_bytes"
    width: int
    height: int
    source_format: str
    low_detail: bool
    fingerprints: Fingerprints
    models: ModelsInfo
    file_url: str
    record_url: str
    disclaimer: str


class BenchmarkTransformMetric(BaseModel):
    model_config = ConfigDict(extra="forbid")
    transform: str
    strength: str
    method: str
    threshold: float
    precision: float
    recall: float
    f1: float
    accuracy: float
    roc_auc: float
    median_latency_ms: float
    n_pairs: int


class BenchmarkScenarioMetric(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: str
    method: str
    metric: str
    value: float


class CascadeMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")
    accuracy: float
    mean_latency_ms: float
    escalation_rate: float


class BenchmarkSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_id: str
    split: str
    n_originals: int
    n_hard_negatives: int
    methods: list[str]
    by_transform: list[BenchmarkTransformMetric]
    scenarios: list[BenchmarkScenarioMetric]
    cascade: CascadeMetrics


class BenchmarkRunInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_id: str
    created_at: UtcDatetime
    n_rows: int
    splits: list[str]


class BenchmarkRow(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_id: str
    split: str
    category: str
    original_id: str
    query_file: str
    transform: str | None = None
    strength: str | None = None
    is_true_copy: bool
    method: str
    score_value: float
    score_type: str
    latency_ms: float
    created_at: UtcDatetime


class ScenarioRow(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: str
    method: str
    metric_name: str
    metric_value: float


class CascadeSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    accuracy: float
    mean_latency_ms: float
    escalation_rate: float


class HealthModelsLoaded(BaseModel):
    model_config = ConfigDict(extra="forbid")
    clip: bool
    dino: bool


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str
    database: str
    pgvector: str | None
    models_loaded: HealthModelsLoaded
    device: str
    config_version: str
    registered_images: int | None
    uptime_s: int


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    error: str
    message: str
