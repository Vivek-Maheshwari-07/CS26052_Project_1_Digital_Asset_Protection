import pytest
import yaml
from pydantic import ValidationError

from app.config import get_config, load_config


def test_load_shipped_config():
    cfg = get_config()
    assert cfg.config_version == "2026.10-1"
    assert cfg.cascade.hash_method == "phash"
    assert cfg.cascade.hamming_confident_max == 8
    assert cfg.cascade.dino_cosine_match_min == 0.90
    assert cfg.models.preprocessing == "pad_to_square"


def test_invalid_hamming_threshold(tmp_path):
    cfg_path = tmp_path / "invalid_config.yaml"
    data = {
        "config_version": "2026.10-1",
        "cascade": {
            "hash_method": "phash",
            "hamming_confident_max": 70,  # Invalid: > 64
            "dino_cosine_match_min": 0.90,
            "top_k": 5,
        },
        "registration": {"hamming_conflict_max": 8, "dino_cosine_conflict_min": 0.95},
        "low_detail": {"grey_std_min": 8.0},
        "models": {
            "clip": "openai/clip-vit-base-patch32",
            "dino": "facebook/dinov2-base",
            "clip_revision": "main",
            "dino_revision": "main",
            "input_size": 224,
            "preprocessing": "pad_to_square",
            "device": "auto",
        },
        "evidence_thresholds": {
            "phash": 8,
            "dhash": 8,
            "ahash": 8,
            "whash": 8,
            "dino": 0.90,
            "clip": 0.90,
        },
        "limits": {
            "max_upload_mb": 10,
            "max_pixels": 40000000,
            "min_short_side_px": 64,
            "inference_concurrency": 2,
            "inference_wait_s": 30,
        },
        "rate_limits": {"verify_per_minute": 10, "register_per_minute": 5},
    }
    with open(cfg_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f)

    with pytest.raises(ValidationError):
        load_config(str(cfg_path))


from pathlib import Path

_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"


def test_invalid_preprocessing(tmp_path):
    cfg_path = tmp_path / "invalid_prep.yaml"
    with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    data["models"]["preprocessing"] = "stretch"
    with open(cfg_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f)

    with pytest.raises(ValidationError):
        load_config(str(cfg_path))


def test_unknown_top_level_key(tmp_path):
    cfg_path = tmp_path / "extra_key.yaml"
    with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    data["unknown_key"] = "forbidden"
    with open(cfg_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f)

    with pytest.raises(ValidationError):
        load_config(str(cfg_path))
