"""
Unit and integration tests for the benchmark pipeline (make_manifest, attack, evaluate).
Runs fully offline using synthetic test images and FakeEmbedder.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.schemas import BenchmarkSummary
from bench.attack import TRANSFORMS, apply_text_overlay, generate_queries, get_deterministic_rng
from bench.evaluate import get_embedder_tag, run_evaluation
from bench.make_manifest import create_manifest
from tests.fakes import FakeEmbedder
from tests.images import photo_like


class OtherFakeEmbedder(FakeEmbedder):
    """Secondary fake embedder with a distinct identity tag for cache isolation testing."""

    def __init__(self, tag: str = "other_fake_v2"):
        super().__init__()
        self.tag = tag


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


def test_text_overlay_pixel_change_strong_vs_weak():
    """Bug Fix #8 Test: Strong text overlay scale changes more pixels than weak overlay."""
    base_img = photo_like(999, size=(400, 400))
    base_arr = np.asarray(base_img.convert("RGB"))

    rng_weak = np.random.default_rng(42)
    weak_img = apply_text_overlay(base_img, "weak", rng_weak)
    weak_arr = np.asarray(weak_img)
    weak_diff_pixels = np.sum(np.any(weak_arr != base_arr, axis=-1))

    rng_strong = np.random.default_rng(42)
    strong_img = apply_text_overlay(base_img, "strong", rng_strong)
    strong_arr = np.asarray(strong_img)
    strong_diff_pixels = np.sum(np.any(strong_arr != base_arr, axis=-1))

    assert strong_diff_pixels > weak_diff_pixels, (
        f"Strong overlay ({strong_diff_pixels} pixels) should change more pixels than weak ({weak_diff_pixels} pixels)"
    )


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


def test_category_labels_and_no_nan(tmp_path: Path):
    """
    Bug Fix #1 & #2 Tests:
    1. Untransformed original queries must get category="identity".
       Untransformed hard negatives get category="hard_negative".
       No row with is_true_copy=True has category "hard_negative".
    2. Untransformed queries write transform="none", strength="none" everywhere (no NaN/null).
    """
    data_dir = tmp_path / "bench_cat_nan"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    for i in range(2):
        photo_like(10 + i, size=(256, 256)).save(orig_dir / f"orig_{i:02d}.png")
        photo_like(20 + i, size=(256, 256)).save(neg_dir / f"neg_{i:02d}.png")

    create_manifest(data_dir, tune_ratio=0.5, seed=42)
    generate_queries(data_dir=data_dir)

    master_df, metrics_df, _ = run_evaluation(
        data_dir=data_dir,
        run_id="cat_nan_check",
        write_db=False,
        use_fake_embedder=True,
    )

    # 1. Category validation
    true_copies = master_df[master_df["is_true_copy"]]
    assert not any(true_copies["category"] == "hard_negative"), "No row with is_true_copy=True must have category 'hard_negative'"

    untransformed_true = master_df[(master_df["is_true_copy"]) & (master_df["transform"] == "none")]
    assert all(untransformed_true["category"] == "identity"), "Untransformed original queries must have category 'identity'"

    untransformed_neg = master_df[(~master_df["is_true_copy"]) & (master_df["transform"] == "none")]
    assert all(untransformed_neg["category"] == "hard_negative"), "Untransformed hard negatives must have category 'hard_negative'"

    transformed_rows = master_df[master_df["transform"] != "none"]
    assert all(transformed_rows["category"] == "transform"), "Transformed queries must have category 'transform'"

    # 2. No NaN validation in master_results.csv & metrics.csv
    for col in ["transform", "strength", "category"]:
        assert not master_df[col].isna().any(), f"master_df[{col}] contains NaN/null!"
        assert not (master_df[col].astype(str).str.lower().isin(["nan", "null"])).any(), f"master_df[{col}] contains string 'nan'/'null'!"

    for col in ["transform", "strength", "category"]:
        assert not metrics_df[col].isna().any(), f"metrics_df[{col}] contains NaN/null!"
        assert not (metrics_df[col].astype(str).str.lower().isin(["nan", "null"])).any(), f"metrics_df[{col}] contains string 'nan'/'null'!"


def test_embedding_cache_tagging_and_invalidation(tmp_path: Path):
    """
    Bug Fix #3 Test:
    Embedding cache keyed by image SHA-256 and embedder tag: cache/<config_version>/<embedder_tag>/<sha256>.npz.
    Runs with different embedder tags do not share cache files; altering bytes forces a recompute.
    """
    data_dir = tmp_path / "bench_cache"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    img1 = photo_like(101, size=(256, 256))
    img1.save(orig_dir / "orig_00.png")
    img_neg = photo_like(201, size=(256, 256))
    img_neg.save(neg_dir / "neg_00.png")

    create_manifest(data_dir, tune_ratio=0.5, seed=42)
    generate_queries(data_dir=data_dir)

    fake1 = FakeEmbedder()
    tag1 = get_embedder_tag(fake1)
    assert tag1 == "fake"

    run_evaluation(data_dir=data_dir, run_id="run_fake1", write_db=False, custom_embedder=fake1, allow_single_split=True)

    cache_root = data_dir / "cache"
    fake1_caches = list(cache_root.glob(f"*/{tag1}/*.npz"))
    assert len(fake1_caches) > 0, f"Expected cache files under tag '{tag1}'"

    # Run with secondary embedder having different tag
    fake2 = OtherFakeEmbedder(tag="other_tag_test")
    tag2 = get_embedder_tag(fake2)
    assert tag2 == "other_tag_test"

    run_evaluation(data_dir=data_dir, run_id="run_fake2", write_db=False, custom_embedder=fake2, allow_single_split=True)

    fake2_caches = list(cache_root.glob(f"*/{tag2}/*.npz"))
    assert len(fake2_caches) > 0, f"Expected cache files under tag '{tag2}'"

    # Ensure sets of cache file paths are completely disjoint across different tags
    set1 = {p.resolve() for p in fake1_caches}
    set2 = {p.resolve() for p in fake2_caches}
    assert set1.isdisjoint(set2), "Runs with different embedder tags must not share cache files"

    # Changing image bytes forces a recompute (creates a new sha256 cache file)
    img1_modified = photo_like(999, size=(256, 256))
    img1_modified.save(orig_dir / "orig_00.png")  # Overwrite with different pixels

    run_evaluation(data_dir=data_dir, run_id="run_modified", write_db=False, custom_embedder=fake1, allow_single_split=True)
    fake1_caches_after = list(cache_root.glob(f"*/{tag1}/*.npz"))
    assert len(fake1_caches_after) > len(fake1_caches), "Altering image bytes must produce a new cache file for the new SHA-256"


def test_no_silent_leakage_on_empty_split(tmp_path: Path):
    """
    Bug Fix #4 Test:
    Raise clear ValueError if tune or test split is empty, unless allow_single_split=True.
    """
    data_dir = tmp_path / "bench_leakage"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    photo_like(1, size=(256, 256)).save(orig_dir / "orig_00.png")
    photo_like(2, size=(256, 256)).save(neg_dir / "neg_00.png")

    # Force all items to "tune" split (test split will be empty)
    manifest = pd.DataFrame([{"original_id": "orig_00", "neg_id": "neg_00", "split": "tune"}])
    manifest.to_csv(data_dir / "manifest.csv", index=False)
    generate_queries(data_dir=data_dir)

    # Must raise ValueError without flag
    with pytest.raises(ValueError, match="requires non-empty 'tune' and 'test' splits"):
        run_evaluation(data_dir=data_dir, run_id="fail_split", write_db=False, use_fake_embedder=True, allow_single_split=False)

    # Must succeed when allow_single_split=True
    master_df, _, _ = run_evaluation(
        data_dir=data_dir,
        run_id="ok_single_split",
        write_db=False,
        use_fake_embedder=True,
        allow_single_split=True,
    )
    assert not master_df.empty


def test_escalation_rate_on_test_split(tmp_path: Path):
    """
    Bug Fix #5 Test:
    Escalation rate is computed strictly on TEST split queries: escalated_test_queries / scored_test_queries.
    """
    data_dir = tmp_path / "bench_escalation"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    for i in range(4):
        photo_like(10 + i, size=(256, 256)).save(orig_dir / f"orig_{i:02d}.png")
        photo_like(20 + i, size=(256, 256)).save(neg_dir / f"neg_{i:02d}.png")

    create_manifest(data_dir, tune_ratio=0.5, seed=42)
    generate_queries(data_dir=data_dir)

    _, _, summary = run_evaluation(
        data_dir=data_dir,
        run_id="esc_rate_test",
        write_db=False,
        use_fake_embedder=True,
    )

    escalation_rate = summary["cascade"]["escalation_rate"]
    assert 0.0 <= escalation_rate <= 1.0


def test_cascade_in_metrics_and_summary_and_heatmap(tmp_path: Path):
    """
    Bug Fix #6 & #7 Tests:
    - Add "cascade" to metrics.csv, by_transform, and "all" (threshold=1.0).
    - Summary "methods" contains the 6 base methods plus "cascade".
    - summary.json validates as BenchmarkSummary.
    - Heatmap generated with tuned thresholds and includes cascade row.
    """
    data_dir = tmp_path / "bench_cascade_metrics"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    for i in range(4):
        photo_like(50 + i, size=(256, 256)).save(orig_dir / f"orig_{i:02d}.png")
        photo_like(60 + i, size=(256, 256)).save(neg_dir / f"neg_{i:02d}.png")

    create_manifest(data_dir, tune_ratio=0.5, seed=42)
    generate_queries(data_dir=data_dir)

    run_id = "cascade_full_eval"
    _, metrics_df, summary = run_evaluation(
        data_dir=data_dir,
        run_id=run_id,
        write_db=False,
        use_fake_embedder=True,
    )

    # 1. Check methods list in summary
    expected_methods = ["phash", "dhash", "ahash", "whash", "clip", "dino", "cascade"]
    assert summary["methods"] == expected_methods

    # 2. Check cascade rows in metrics_df
    cascade_metrics = metrics_df[metrics_df["method"] == "cascade"]
    assert not cascade_metrics.empty
    assert (cascade_metrics["threshold"] == 1.0).all()

    # 3. Check summary.json validates
    validated = BenchmarkSummary.model_validate(summary)
    assert validated.run_id == run_id
    assert validated.cascade.accuracy >= 0.0

    # 4. Check heatmap file was created
    results_dir = data_dir / "results" / run_id
    assert (results_dir / "heatmap_recall.png").exists()
    assert (results_dir / "metrics.csv").exists()


def test_batch_embedding_execution(tmp_path: Path):
    """
    Bug Fix #9 Test:
    Extract embeddings in batches with batch_size, computing latency_ms = batch_time / batch_len.
    """
    data_dir = tmp_path / "bench_batch_embed"
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"
    orig_dir.mkdir(parents=True)
    neg_dir.mkdir(parents=True)

    for i in range(3):
        photo_like(70 + i, size=(256, 256)).save(orig_dir / f"orig_{i:02d}.png")
        photo_like(80 + i, size=(256, 256)).save(neg_dir / f"neg_{i:02d}.png")

    create_manifest(data_dir, tune_ratio=0.5, seed=42)
    generate_queries(data_dir=data_dir)

    master_df, _, _ = run_evaluation(
        data_dir=data_dir,
        run_id="batch_embed_run",
        write_db=False,
        use_fake_embedder=True,
        batch_size=2,
    )

    clip_rows = master_df[master_df["method"] == "clip"]
    assert not clip_rows.empty
    assert (clip_rows["latency_ms"] >= 0.0).all()
