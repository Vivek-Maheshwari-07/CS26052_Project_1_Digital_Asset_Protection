from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class CascadeCfg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hash_method: Literal["phash"]
    hamming_confident_max: int = Field(ge=0, le=64)
    dino_cosine_match_min: float = Field(ge=-1.0, le=1.0)
    top_k: int = Field(ge=1, le=20)


class RegistrationCfg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hamming_conflict_max: int = Field(ge=0, le=64)
    dino_cosine_conflict_min: float = Field(ge=-1.0, le=1.0)


class LowDetailCfg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    grey_std_min: float = Field(ge=0.0)


class ModelsCfg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    clip: str
    dino: str
    clip_revision: str = "main"
    dino_revision: str = "main"
    input_size: int = Field(ge=1)
    preprocessing: Literal["pad_to_square", "center_crop"]
    device: Literal["auto", "cpu", "cuda"]


class EvidenceThresholdsCfg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    phash: int = Field(ge=0, le=64)
    dhash: int = Field(ge=0, le=64)
    ahash: int = Field(ge=0, le=64)
    whash: int = Field(ge=0, le=64)
    dino: float = Field(ge=-1.0, le=1.0)
    clip: float = Field(ge=-1.0, le=1.0)


class LimitsCfg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    max_upload_mb: int = Field(gt=0)
    max_pixels: int = Field(gt=0)
    min_short_side_px: int = Field(gt=0)
    inference_concurrency: int = Field(gt=0)
    inference_wait_s: int = Field(gt=0)


class RateLimitsCfg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verify_per_minute: int = Field(gt=0)
    register_per_minute: int = Field(gt=0)


class AppConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    config_version: str
    cascade: CascadeCfg
    registration: RegistrationCfg
    low_detail: LowDetailCfg
    models: ModelsCfg
    evidence_thresholds: EvidenceThresholdsCfg
    limits: LimitsCfg
    rate_limits: RateLimitsCfg


def load_config(path: str | Path) -> AppConfig:
    p = Path(path)
    if not p.is_absolute():
        # resolve relative to backend/ (parent of app/)
        backend_dir = Path(__file__).resolve().parent.parent
        p = backend_dir / p
    with open(p, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return AppConfig.model_validate(data)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            Path(__file__).resolve().parents[2] / ".env",
            Path(__file__).resolve().parents[1] / ".env",
            ".env",
        ),
        extra="ignore",
    )
    database_url: str = "postgresql+asyncpg://provnet:provnet@localhost:5432/provnet"
    vector_schema: str = "public"
    provnet_config: str = "config.yaml"
    storage_dir: str = "storage"
    hf_home: str = ".hf_cache"
    frontend_origin: str = "http://localhost:5173"
    provnet_skip_models: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_config() -> AppConfig:
    settings = get_settings()
    return load_config(settings.provnet_config)
