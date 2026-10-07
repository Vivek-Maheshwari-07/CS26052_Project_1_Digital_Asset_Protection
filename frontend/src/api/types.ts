/**
 * TypeScript API definitions mirroring backend/app/schemas.py and JSON spec examples.
 * All nullable fields strictly match backend schema definitions.
 */

export interface Fingerprints {
  phash: string;
  dhash: string;
  ahash: string;
  whash: string;
}

export interface ModelsInfo {
  clip: string;
  dino: string;
  config_version: string;
}

export interface RegisterResponse {
  image_id: string;
  owner_name: string | null;
  registered_at: string;
  sha256: string;
  width: number;
  height: number;
  low_detail: boolean;
  fingerprints: Fingerprints;
  models: ModelsInfo;
  record_url: string;
}

export interface HammingScores {
  phash: number;
  dhash: number;
  ahash: number;
  whash: number;
}

export interface CosineScores {
  dino: number | null;
  clip: number | null;
}

export interface ExistingMatch {
  image_id: string;
  registered_at: string;
  thumbnail_url: string;
  hamming: HammingScores;
  cosine: CosineScores;
}

export interface ConflictThresholds {
  hamming_conflict_max: number;
  dino_cosine_conflict_min: number;
}

export interface ConflictResponse {
  error: "near_duplicate";
  reason: "sha256" | "hash" | "dino_cosine";
  message: string;
  existing: ExistingMatch;
  thresholds: ConflictThresholds;
}

export interface QueryInfo {
  sha256: string;
  width: number | null;
  height: number | null;
  low_detail: boolean;
}

export interface Sha256Stage {
  stage: "sha256";
  hit: boolean;
  latency_ms: number;
}

export interface HashStage {
  stage: "hash";
  best_phash_hamming: number | null;
  confident: boolean;
  latency_ms: number;
}

export interface EmbeddingStage {
  stage: "embedding";
  best_dino_cosine: number | null;
  passed: boolean;
  latency_ms: number;
}

export type Stage = Sha256Stage | HashStage | EmbeddingStage;

export interface AboveThreshold {
  hash: boolean;
  dino: boolean | null;
}

export interface Candidate {
  rank: number;
  image_id: string;
  owner_name: string | null;
  registered_at: string;
  thumbnail_url: string;
  hamming: HammingScores;
  cosine: CosineScores;
  above_threshold: AboveThreshold;
}

export interface EvidenceThresholds {
  phash?: number | null;
  dhash?: number | null;
  ahash?: number | null;
  whash?: number | null;
  dino?: number | null;
  clip?: number | null;
}

export interface VerifyThresholds {
  hamming_confident_max: number;
  dino_cosine_match_min: number;
  evidence?: EvidenceThresholds | null;
}

export interface VerifyResponse {
  verification_id: string;
  decided_by: "sha256" | "hash" | "embedding" | "none";
  verdict: "match" | "no_match";
  query: QueryInfo;
  thresholds: VerifyThresholds;
  config_version: string;
  stages: Stage[];
  candidates: Candidate[];
  latency_ms: number;
}

export interface ImageDetail {
  image_id: string;
  owner_name: string | null;
  registered_at: string;
  sha256: string;
  width: number;
  height: number;
  source_format: string;
  low_detail: boolean;
  fingerprints: Fingerprints;
  models: ModelsInfo;
  file_url: string;
  record_url: string;
}

export interface DeepAboveThreshold {
  dino: boolean;
  clip: boolean;
}

export interface DeepCandidate {
  rank: number;
  image_id: string;
  cosine: CosineScores;
  above_threshold: DeepAboveThreshold;
}

export interface DeepVerifyResponse {
  verification_id: string;
  decided_by: "sha256" | "hash" | "embedding" | "none";
  query_sha256: string;
  thresholds: EvidenceThresholds;
  candidates: DeepCandidate[];
  embedding_latency_ms: number | null;
  latency_ms: number;
}

export interface RegistrationRecord {
  record_type: "provnet.registration_record";
  record_version: "1";
  image_id: string;
  owner_name: string | null;
  owner_name_verified: false;
  registered_at: string;
  issued_at: string;
  sha256: string;
  sha256_scope: "original_upload_bytes";
  width: number;
  height: number;
  source_format: string;
  low_detail: boolean;
  fingerprints: Fingerprints;
  models: ModelsInfo;
  file_url: string;
  record_url: string;
  disclaimer: string;
}

export interface BenchmarkTransformMetric {
  transform: string;
  strength: string;
  method: string;
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  roc_auc: number;
  median_latency_ms: number;
  n_pairs: number;
}

export interface BenchmarkScenarioMetric {
  category: string;
  method: string;
  metric: string;
  value: number;
}

export interface CascadeMetrics {
  accuracy: number;
  mean_latency_ms: number;
  escalation_rate: number;
}

export interface BenchmarkSummary {
  run_id: string;
  split: string;
  n_originals: number;
  n_hard_negatives: number;
  methods: string[];
  by_transform: BenchmarkTransformMetric[];
  scenarios: BenchmarkScenarioMetric[];
  cascade: CascadeMetrics;
}

export interface BenchmarkRunInfo {
  run_id: string;
  created_at: string;
  n_rows: number;
  splits: string[];
}

export interface BenchmarkRow {
  run_id: string;
  split: string;
  category: string;
  original_id: string;
  query_file: string;
  transform: string | null;
  strength: string | null;
  is_true_copy: boolean;
  method: string;
  score_value: number;
  score_type: string;
  latency_ms: number;
  created_at: string;
}

export interface HealthModelsLoaded {
  clip: boolean;
  dino: boolean;
}

export interface HealthResponse {
  status: string;
  database: string;
  pgvector: string | null;
  models_loaded: HealthModelsLoaded;
  device: string;
  config_version: string;
  registered_images: number | null;
  uptime_s: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
