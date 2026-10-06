import json
import pathlib

import pytest
from pydantic import ValidationError

from app.schemas import (
    BenchmarkSummary,
    ConflictResponse,
    ErrorResponse,
    HealthResponse,
    ImageDetail,
    RegisterResponse,
    VerifyResponse,
)

FIXTURES_DIR = pathlib.Path(__file__).parent / "fixtures" / "spec_examples"


def load_fixture(name: str) -> dict:
    with open(FIXTURES_DIR / name, "r", encoding="utf-8") as f:
        return json.load(f)


def strip_none_keys(data):
    """Recursively remove keys whose value is None from dicts and lists."""
    if isinstance(data, dict):
        return {k: strip_none_keys(v) for k, v in data.items() if v is not None}
    if isinstance(data, list):
        return [strip_none_keys(v) for v in data]
    return data


def test_register_201_schema():
    data = load_fixture("register_201.json")
    model = RegisterResponse.model_validate(data)
    dumped = model.model_dump(mode="json", by_alias=True, exclude_none=False)
    assert strip_none_keys(dumped) == strip_none_keys(data)


def test_register_409_schema():
    data = load_fixture("register_409.json")
    model = ConflictResponse.model_validate(data)
    dumped = model.model_dump(mode="json", by_alias=True, exclude_none=False)
    assert strip_none_keys(dumped) == strip_none_keys(data)


def test_verify_escalated_schema():
    data = load_fixture("verify_escalated.json")
    model = VerifyResponse.model_validate(data)
    dumped = model.model_dump(mode="json", by_alias=True, exclude_none=False)
    assert strip_none_keys(dumped) == strip_none_keys(data)
    assert "evidence" in model.model_dump(mode="json")["thresholds"]


def test_verify_hash_exit_schema():
    data = load_fixture("verify_hash_exit.json")
    model = VerifyResponse.model_validate(data)
    dumped = model.model_dump(mode="json", by_alias=True, exclude_none=False)
    assert strip_none_keys(dumped) == strip_none_keys(data)
    assert "evidence" in model.model_dump(mode="json")["thresholds"]


def test_image_detail_schema():
    data = load_fixture("image_detail.json")
    model = ImageDetail.model_validate(data)
    dumped = model.model_dump(mode="json", by_alias=True, exclude_none=False)
    assert strip_none_keys(dumped) == strip_none_keys(data)


def test_benchmark_summary_schema():
    data = load_fixture("benchmark_summary.json")
    model = BenchmarkSummary.model_validate(data)
    dumped = model.model_dump(mode="json", by_alias=True, exclude_none=False)
    assert strip_none_keys(dumped) == strip_none_keys(data)


def test_health_schema():
    data = load_fixture("health.json")
    model = HealthResponse.model_validate(data)
    dumped = model.model_dump(mode="json", by_alias=True, exclude_none=False)
    assert strip_none_keys(dumped) == strip_none_keys(data)


def test_error_schema():
    data = load_fixture("error.json")
    model = ErrorResponse.model_validate(data)
    dumped = model.model_dump(mode="json", by_alias=True, exclude_none=False)
    assert strip_none_keys(dumped) == strip_none_keys(data)


def test_extra_keys_forbidden():
    data = load_fixture("error.json")
    data["extra_unexpected_field"] = "bad"
    with pytest.raises(ValidationError):
        ErrorResponse.model_validate(data)


def test_no_forbidden_property_names():
    forbidden = {"confidence", "score", "combined", "fused"}
    models = [
        RegisterResponse,
        ConflictResponse,
        VerifyResponse,
        ImageDetail,
        BenchmarkSummary,
        HealthResponse,
        ErrorResponse,
    ]

    def check_schema_props(schema_dict):
        if not isinstance(schema_dict, dict):
            return
        if "properties" in schema_dict:
            for prop in schema_dict["properties"]:
                assert prop not in forbidden, f"Forbidden property '{prop}' found in schema!"
        for val in schema_dict.values():
            if isinstance(val, dict):
                check_schema_props(val)
            elif isinstance(val, list):
                for item in val:
                    check_schema_props(item)

    for m in models:
        check_schema_props(m.model_json_schema())
