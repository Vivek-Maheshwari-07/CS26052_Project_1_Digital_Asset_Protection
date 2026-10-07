"""
Tests for the Benchmark API endpoints (/api/benchmark/runs, /api/benchmark/summary, /api/benchmark/results.csv).
Verifies empty DB handling, multi-run selection, 404 on unknown runs, and full end-to-end consistency
between evaluate.py outputs and API responses.
"""

import csv
import io
import json
import math
import os
from pathlib import Path

from starlette.testclient import TestClient

from app.config import get_settings
from app.schemas import BenchmarkSummary
from bench.attack import generate_queries
from bench.evaluate import run_evaluation
from bench.make_manifest import create_manifest
from tests.images import photo_like


def test_empty_db_benchmark_endpoints(api_client: TestClient):
    """Empty DB: /runs returns empty list; /summary and /results.csv return 404."""
    # 1. /runs -> []
    res_runs = api_client.get("/api/benchmark/runs")
    assert res_runs.status_code == 200
    assert res_runs.json() == []

    # 2. /summary -> 404
    res_summary = api_client.get("/api/benchmark/summary")
    assert res_summary.status_code == 404
    body = res_summary.json()
    assert body["error"] == "not_found"

    # 3. /results.csv -> 404
    res_csv = api_client.get("/api/benchmark/results.csv")
    assert res_csv.status_code == 404
    assert res_csv.json()["error"] == "not_found"


def test_benchmark_api_end_to_end_consistency(
    api_client: TestClient,
    tmp_path: Path,
    async_db_url: str,
):
    """
    End-to-end consistency test:
    Build 6 originals + 6 hard negatives with photo_like in tmp_path, run manifest, attack,
    and evaluate with write_db=True, then assert:
    - /summary validates as BenchmarkSummary
    - cascade.escalation_rate, cascade.accuracy, and by_transform match summary.json
    - /results.csv has matching row count and columns to master_results.csv
    """
    # Ensure evaluate.py connects to test database
    os.environ["DATABASE_URL"] = async_db_url
    get_settings.cache_clear()

    data_dir = tmp_path / "bench_e2e"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    # 6 originals + 6 hard negatives
    for i in range(6):
        photo_like(100 + i, size=(256, 256)).save(orig_dir / f"orig_{i:03d}.png")
        photo_like(200 + i, size=(256, 256)).save(neg_dir / f"neg_{i:03d}.png")

    create_manifest(data_dir, tune_ratio=0.5, seed=42)
    generate_queries(data_dir=data_dir)

    run_id = "test_run_e2e_api"
    _, _, _ = run_evaluation(
        data_dir=data_dir,
        run_id=run_id,
        write_db=True,
        use_fake_embedder=True,
    )

    results_dir = data_dir / "results" / run_id
    summary_file = results_dir / "summary.json"
    with open(summary_file, "r", encoding="utf-8") as f:
        expected_summary = json.load(f)

    # 1. GET /api/benchmark/runs
    res_runs = api_client.get("/api/benchmark/runs")
    assert res_runs.status_code == 200
    runs_data = res_runs.json()
    assert len(runs_data) == 1
    assert runs_data[0]["run_id"] == run_id
    assert runs_data[0]["n_rows"] > 0
    assert set(runs_data[0]["splits"]) == {"test", "tune"}
    assert runs_data[0]["created_at"].endswith("Z")

    # 2. GET /api/benchmark/summary
    res_summary = api_client.get(f"/api/benchmark/summary?run_id={run_id}")
    assert res_summary.status_code == 200
    summary_json = res_summary.json()

    # Validates as BenchmarkSummary
    validated = BenchmarkSummary.model_validate(summary_json)
    assert validated.run_id == run_id
    assert validated.split == "test"
    assert validated.n_originals == expected_summary["n_originals"]
    assert validated.n_hard_negatives == expected_summary["n_hard_negatives"]
    assert validated.methods == expected_summary["methods"]

    # Match cascade metrics within 1e-6
    assert math.isclose(
        validated.cascade.accuracy,
        expected_summary["cascade"]["accuracy"],
        rel_tol=1e-6,
        abs_tol=1e-6,
    )
    assert math.isclose(
        validated.cascade.mean_latency_ms,
        expected_summary["cascade"]["mean_latency_ms"],
        rel_tol=1e-6,
        abs_tol=1e-6,
    )
    assert math.isclose(
        validated.cascade.escalation_rate,
        expected_summary["cascade"]["escalation_rate"],
        rel_tol=1e-6,
        abs_tol=1e-6,
    )

    # Match by_transform metrics
    expected_by_tf = {
        (item["method"], item["transform"], item["strength"]): item
        for item in expected_summary["by_transform"]
    }
    actual_by_tf = {
        (item.method, item.transform, item.strength): item
        for item in validated.by_transform
    }
    assert set(expected_by_tf.keys()) == set(actual_by_tf.keys())

    for key, exp in expected_by_tf.items():
        act = actual_by_tf[key]
        assert math.isclose(act.threshold, exp["threshold"], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(act.precision, exp["precision"], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(act.recall, exp["recall"], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(act.f1, exp["f1"], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(act.accuracy, exp["accuracy"], rel_tol=1e-6, abs_tol=1e-6)
        assert math.isclose(act.roc_auc, exp["roc_auc"], rel_tol=1e-6, abs_tol=1e-6)
        assert act.n_pairs == exp["n_pairs"]

    # 3. GET /api/benchmark/results.csv
    res_csv = api_client.get(f"/api/benchmark/results.csv?run_id={run_id}")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert f'filename="provnet-{run_id}-master_results.csv"' in res_csv.headers["content-disposition"]

    csv_reader = list(csv.DictReader(io.StringIO(res_csv.text)))
    master_csv_path = results_dir / "master_results.csv"
    with open(master_csv_path, "r", encoding="utf-8") as f:
        expected_csv_rows = list(csv.DictReader(f))

    assert len(csv_reader) == len(expected_csv_rows)
    expected_headers = [
        "run_id", "split", "category", "original_id", "query_file",
        "transform", "strength", "is_true_copy", "method", "score",
        "score_kind", "latency_ms", "created_at",
    ]
    assert list(csv_reader[0].keys()) == expected_headers


def test_benchmark_api_run_selection_and_404(
    api_client: TestClient,
    tmp_path: Path,
    async_db_url: str,
):
    """Test unknown run_id 404, and omitting run_id picks the newest run."""
    os.environ["DATABASE_URL"] = async_db_url
    get_settings.cache_clear()

    data_dir = tmp_path / "bench_multirun"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    photo_like(1, size=(256, 256)).save(orig_dir / "orig_000.png")
    photo_like(2, size=(256, 256)).save(neg_dir / "neg_000.png")

    create_manifest(data_dir, tune_ratio=0.5, seed=42)
    generate_queries(data_dir=data_dir)

    # Insert Run 1
    run_evaluation(
        data_dir=data_dir,
        run_id="run_01_old",
        write_db=True,
        use_fake_embedder=True,
        allow_single_split=True,
    )

    # Insert Run 2
    run_evaluation(
        data_dir=data_dir,
        run_id="run_02_new",
        write_db=True,
        use_fake_embedder=True,
        allow_single_split=True,
    )

    # 1. Unknown run returns 404
    res_bad_summary = api_client.get("/api/benchmark/summary?run_id=does_not_exist")
    assert res_bad_summary.status_code == 404
    assert res_bad_summary.json()["error"] == "not_found"

    res_bad_csv = api_client.get("/api/benchmark/results.csv?run_id=does_not_exist")
    assert res_bad_csv.status_code == 404
    assert res_bad_csv.json()["error"] == "not_found"

    # 2. Omitting run_id picks newest run (run_02_new)
    res_latest_summary = api_client.get("/api/benchmark/summary")
    assert res_latest_summary.status_code == 200
    assert res_latest_summary.json()["run_id"] == "run_02_new"

    res_latest_csv = api_client.get("/api/benchmark/results.csv")
    assert res_latest_csv.status_code == 200
    assert 'filename="provnet-run_02_new-master_results.csv"' in res_latest_csv.headers["content-disposition"]
