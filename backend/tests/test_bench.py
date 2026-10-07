"""
Unit and integration tests for the benchmark pipeline (make_manifest, attack, evaluate).
Runs fully offline using synthetic test images and FakeEmbedder.
"""

from pathlib import Path

import numpy as np

from app.schemas import BenchmarkSummary
from bench.attack import TRANSFORMS, generate_queries, get_deterministic_rng
from bench.evaluate import run_evaluation
from bench.make_manifest import create_manifest
from tests.images import photo_like


def test_attack_transforms_deterministic():
    """Verify that all attack transform functions produce identical output given identical seed."""
    img = photo_like(1234, size=(256, 256))

    for name, (func, strengths) in TRANSFORMS.items():
        for strength in strengths:
            rng1 = get_deterministic_rng("img_01", name, strength)
            out1 = func(img, strength, rng1)

            rng2 = get_deterministic_rng("img_01", name, strength)
            out2 = func(img, strength, rng2)

            arr1 = np.asarray(out1)
            arr2 = np.asarray(out2)

            assert np.array_equal(arr1, arr2), f"Transform {name} ({strength}) is non-deterministic!"
            assert out1.size[0] >= 32 and out1.size[1] >= 32, f"Transform {name} produced abnormal dimensions: {out1.size}"


def test_attack_queries_labels(tmp_path: Path):
    """Verify make_manifest and attack query generator create correct is_true_copy labels."""
    data_dir = tmp_path / "bench_data"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    # Create 2 synthetic original images and 2 hard negatives
    for i in range(2):
        img_orig = photo_like(100 + i, size=(256, 256))
        img_orig.save(orig_dir / f"orig_{i:03d}.jpg")

        img_neg = photo_like(200 + i, size=(256, 256))
        img_neg.save(neg_dir / f"neg_{i:03d}.jpg")

    # 1. Create manifest
    manifest_df = create_manifest(data_dir, tune_ratio=0.5, seed=42)
    assert len(manifest_df) == 2
    assert set(manifest_df.columns) == {"original_id", "neg_id", "split"}
    assert set(manifest_df["split"].unique()).issubset({"tune", "test"})

    # 2. Generate attacks
    queries_df = generate_queries(data_dir=data_dir)
    assert len(queries_df) > 0
    assert "query_file" in queries_df.columns
    assert "is_true_copy" in queries_df.columns

    # Verify is_true_copy correctness
    orig_queries = queries_df[queries_df["source_kind"] == "original"]
    neg_queries = queries_df[queries_df["source_kind"] == "hard_negative"]

    assert all(orig_queries["is_true_copy"]), "Originals must have is_true_copy=True"
    assert not any(neg_queries["is_true_copy"]), "Hard negatives must have is_true_copy=False"


def test_evaluate_pipeline_end_to_end(tmp_path: Path):
    """Build a tiny dataset in tmp_path and run evaluation using FakeEmbedder."""
    data_dir = tmp_path / "benchmark"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    # Create 4 originals and 4 hard negatives
    for i in range(4):
        img_o = photo_like(300 + i, size=(256, 256))
        img_o.save(orig_dir / f"orig_{i:03d}.png")

        img_n = photo_like(400 + i, size=(256, 256))
        img_n.save(neg_dir / f"neg_{i:03d}.png")

    # 1. Manifest
    create_manifest(data_dir, tune_ratio=0.5, seed=42)

    # 2. Queries
    generate_queries(data_dir=data_dir)

    # 3. Run Evaluation with FakeEmbedder
    run_id = "test_run_01"
    master_df, metrics_df, summary = run_evaluation(
        data_dir=data_dir,
        run_id=run_id,
        write_db=False,
        use_fake_embedder=True,
    )

    # Check Master Results
    assert not master_df.empty
    expected_cols = {
        "run_id", "split", "category", "original_id", "query_file",
        "transform", "strength", "is_true_copy", "method", "score",
        "score_kind", "latency_ms",
    }
    assert expected_cols.issubset(set(master_df.columns))

    methods_present = set(master_df["method"].unique())
    assert {"phash", "dhash", "ahash", "whash", "clip", "dino", "cascade"}.issubset(methods_present)

    # Check Metrics
    assert not metrics_df.empty
    assert "roc_auc" in metrics_df.columns
    assert "f1" in metrics_df.columns

    # Validate Summary with Pydantic model
    validated = BenchmarkSummary.model_validate(summary)
    assert validated.run_id == run_id
    assert validated.split == "test"
    assert validated.cascade.accuracy >= 0.0

    # Verify Generated Files and Plots
    results_dir = data_dir / "results" / run_id
    assert (results_dir / "master_results.csv").exists()
    assert (results_dir / "metrics.csv").exists()
    assert (results_dir / "summary.json").exists()
    assert (results_dir / "roc_all.png").exists()
    assert (results_dir / "latency.png").exists()
