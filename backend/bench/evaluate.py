"""
ProvNet Benchmark Evaluation Engine.
Evaluates all perceptual hashing, deep embedding, and cascade methods across attack queries.
Generates metrics, summary JSON, plots, and optional PostgreSQL database persistence.
"""

import argparse
import json
import re
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from PIL import Image
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score, roc_curve
from sqlalchemy import text

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import get_config, get_settings
from app.core.embedder import Embedder, resolve_device
from app.core.hasher import compute_hashes, hamming
from app.core.ingest import Ingested, ingest
from app.db import make_sync_engine
from app.schemas import BenchmarkSummary

# =============================================================================
# Helper: Embedder Identity & Cache Paths
# =============================================================================

def get_embedder_tag(embedder) -> str:
    """Return a filesystem-safe identifier tag for the embedder."""
    if hasattr(embedder, "tag") and embedder.tag:
        return str(embedder.tag)
    if embedder.__class__.__name__ == "FakeEmbedder":
        return "fake"

    clip_id = getattr(embedder, "clip_id", "clip")
    clip_rev = getattr(embedder, "clip_revision", "main")
    dino_id = getattr(embedder, "dino_id", "dino")
    dino_rev = getattr(embedder, "dino_revision", "main")

    raw_slug = f"{clip_id}@{clip_rev}+{dino_id}@{dino_rev}"
    # Replace any unsafe path characters with underscore
    safe_slug = re.sub(r'[/\\:*?"<>| ]', "_", raw_slug)
    return safe_slug


def get_image_cache_path(cache_dir: Path, config_version: str, embedder_tag: str, sha256: str) -> Path:
    target_dir = cache_dir / config_version / embedder_tag
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir / f"{sha256}.npz"


# =============================================================================
# Core Benchmark Runner
# =============================================================================

def run_evaluation(
    data_dir: Path,
    run_id: str,
    write_db: bool = False,
    use_fake_embedder: bool = False,
    device_override: str | None = None,
    allow_single_split: bool = False,
    batch_size: int = 16,
    custom_embedder=None,
) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    cfg = get_config()
    settings = get_settings()

    # Determine embedder
    if custom_embedder is not None:
        embedder = custom_embedder
    elif use_fake_embedder:
        from tests.fakes import FakeEmbedder
        embedder = FakeEmbedder()
    else:
        dev = device_override or resolve_device(cfg.models.device)
        embedder = Embedder(cfg.models, dev)
        embedder.warm_up()

    embedder_tag = get_embedder_tag(embedder)

    manifest_path = data_dir / "manifest.csv"
    queries_path = data_dir / "queries.csv"

    if not manifest_path.exists():
        raise FileNotFoundError(f"Missing {manifest_path}. Run make_manifest first.")
    if not queries_path.exists():
        raise FileNotFoundError(f"Missing {queries_path}. Run attack first.")

    manifest_df = pd.read_csv(manifest_path)
    queries_df = pd.read_csv(queries_path)

    orig_dir = data_dir / "originals"
    queries_dir = data_dir / "queries"
    cache_dir = data_dir / "cache"
    results_dir = data_dir / "results" / run_id
    results_dir.mkdir(parents=True, exist_ok=True)

    config_version = cfg.config_version

    print(f"--- Starting Evaluation Run: {run_id} ---")
    print(f"Embedder: {embedder_tag} | Batch Size: {batch_size}")
    print(f"Manifest: {len(manifest_df)} pairs | Queries: {len(queries_df)} items")

    # =========================================================================
    # Step 1: Ingest all unique images & compute hashes
    # =========================================================================
    print("Ingesting images and computing perceptual hashes...")
    unique_paths: dict[str, Path] = {}

    for orig_id in manifest_df["original_id"].unique():
        orig_files = list(orig_dir.glob(f"{orig_id}.*"))
        if orig_files:
            unique_paths[f"orig:{orig_id}"] = orig_files[0]

    for q_file in queries_df["query_file"].unique():
        q_path = queries_dir / str(q_file)
        if q_path.exists():
            unique_paths[f"query:{q_file}"] = q_path

    ingested_data: dict[str, tuple[Ingested, dict, float]] = {}
    uncached_images_to_embed: list[tuple[str, Image.Image, Path]] = []
    cached_embeddings: dict[str, tuple[np.ndarray, np.ndarray, float]] = {}

    for key, p in unique_paths.items():
        raw_bytes = p.read_bytes()
        ing = ingest(raw_bytes, cfg.limits)

        t0 = time.perf_counter()
        h_res = compute_hashes(ing.image, cfg)
        hash_lat = (time.perf_counter() - t0) * 1000.0

        h_dict = {
            "phash": h_res.phash,
            "dhash": h_res.dhash,
            "ahash": h_res.ahash,
            "whash": h_res.whash,
            "low_detail": h_res.low_detail,
            "grey_std": h_res.grey_std,
        }
        ingested_data[key] = (ing, h_dict, hash_lat)

        # Check embedding cache
        cache_file = get_image_cache_path(cache_dir, config_version, embedder_tag, ing.sha256)
        if cache_file.exists():
            try:
                with np.load(cache_file) as data:
                    clip_vec = data["clip"]
                    dino_vec = data["dino"]
                    embed_lat = float(data.get("latency_ms", 0.0))
                    cached_embeddings[key] = (clip_vec, dino_vec, embed_lat)
            except Exception:  # noqa: BLE001
                uncached_images_to_embed.append((key, ing.image, cache_file))
        else:
            uncached_images_to_embed.append((key, ing.image, cache_file))

    # =========================================================================
    # Step 2: Batch Embeddings Extraction for Uncached Images
    # =========================================================================
    if uncached_images_to_embed:
        total_uncached = len(uncached_images_to_embed)
        print(f"Extracting embeddings in batches of {batch_size} for {total_uncached} uncached images...")

        for b_start in range(0, total_uncached, batch_size):
            b_items = uncached_images_to_embed[b_start:b_start + batch_size]
            b_images = [item[1] for item in b_items]

            t0 = time.perf_counter()
            clip_batch, dino_batch = embedder.embed_batch(b_images)
            batch_time_ms = (time.perf_counter() - t0) * 1000.0
            per_img_lat_ms = batch_time_ms / len(b_items)

            for i, (key, _, c_path) in enumerate(b_items):
                c_vec = clip_batch[i].astype(np.float32)
                d_vec = dino_batch[i].astype(np.float32)
                np.savez_compressed(c_path, clip=c_vec, dino=d_vec, latency_ms=per_img_lat_ms)
                cached_embeddings[key] = (c_vec, d_vec, per_img_lat_ms)

            processed = min(b_start + batch_size, total_uncached)
            if processed % 200 == 0 or processed == total_uncached:
                print(f"Progress: {processed}/{total_uncached} images embedded ({processed/total_uncached*100:.1f}%)")
    else:
        print("All image embeddings found in disk cache!")

    # =========================================================================
    # Step 3: Score All Query Pairs
    # =========================================================================
    print("Scoring all query items across methods...")
    master_records = []
    
    # Escalation tracking per split
    test_scored_count = 0
    test_escalated_count = 0

    for _, row in queries_df.iterrows():
        q_file = str(row["query_file"])
        orig_id = str(row["original_id"])
        split = str(row["split"])
        transform = str(row["transform"])
        strength = str(row["strength"])
        is_true_copy = bool(row["is_true_copy"])

        # Category determination
        if transform == "none":
            category = "identity" if is_true_copy else "hard_negative"
        else:
            category = "transform"

        orig_key = f"orig:{orig_id}"
        query_key = f"query:{q_file}"

        if orig_key not in ingested_data or query_key not in ingested_data:
            continue

        _, orig_h, orig_h_lat = ingested_data[orig_key]
        _, q_h, q_h_lat = ingested_data[query_key]

        orig_clip, orig_dino, orig_e_lat = cached_embeddings[orig_key]
        q_clip, q_dino, q_e_lat = cached_embeddings[query_key]

        h_lat = (orig_h_lat + q_h_lat) / 2.0
        e_lat = (orig_e_lat + q_e_lat) / 2.0

        # 1. Perceptual Hashes (Hamming distance)
        for h_name in ["phash", "dhash", "ahash", "whash"]:
            dist = hamming(orig_h[h_name], q_h[h_name])
            master_records.append({
                "run_id": run_id,
                "split": split,
                "category": category,
                "original_id": orig_id,
                "query_file": q_file,
                "transform": transform,
                "strength": strength,
                "is_true_copy": is_true_copy,
                "method": h_name,
                "score": float(dist),
                "score_kind": "hamming",
                "latency_ms": h_lat,
            })

        # 2. Deep Embeddings (Cosine similarity)
        cos_clip = float(np.dot(orig_clip, q_clip))
        cos_dino = float(np.dot(orig_dino, q_dino))

        master_records.append({
            "run_id": run_id,
            "split": split,
            "category": category,
            "original_id": orig_id,
            "query_file": q_file,
            "transform": transform,
            "strength": strength,
            "is_true_copy": is_true_copy,
            "method": "clip",
            "score": cos_clip,
            "score_kind": "cosine",
            "latency_ms": e_lat,
        })
        master_records.append({
            "run_id": run_id,
            "split": split,
            "category": category,
            "original_id": orig_id,
            "query_file": q_file,
            "transform": transform,
            "strength": strength,
            "is_true_copy": is_true_copy,
            "method": "dino",
            "score": cos_dino,
            "score_kind": "cosine",
            "latency_ms": e_lat,
        })

        # 3. Live Cascade Method
        d_phash = hamming(orig_h["phash"], q_h["phash"])
        low_detail_either = orig_h["low_detail"] or q_h["low_detail"]

        if not low_detail_either and d_phash <= cfg.cascade.hamming_confident_max:
            cascade_decision = 1.0
            cascade_lat = h_lat
            escalated = False
        else:
            escalated = True
            if cos_dino >= cfg.cascade.dino_cosine_match_min:
                cascade_decision = 1.0
            else:
                cascade_decision = 0.0
            cascade_lat = h_lat + e_lat

        if split == "test":
            test_scored_count += 1
            if escalated:
                test_escalated_count += 1

        master_records.append({
            "run_id": run_id,
            "split": split,
            "category": category,
            "original_id": orig_id,
            "query_file": q_file,
            "transform": transform,
            "strength": strength,
            "is_true_copy": is_true_copy,
            "method": "cascade",
            "score": cascade_decision,
            "score_kind": "decision",
            "latency_ms": cascade_lat,
        })

    master_df = pd.DataFrame(master_records)
    master_csv_path = results_dir / "master_results.csv"
    master_df.to_csv(master_csv_path, index=False)
    print(f"Saved master results -> {master_csv_path} ({len(master_df)} rows)")

    # =========================================================================
    # Step 4: Split Validation & Threshold Optimization
    # =========================================================================
    tune_df = master_df[master_df["split"] == "tune"]
    test_df = master_df[master_df["split"] == "test"]

    if len(tune_df) == 0 or len(test_df) == 0:
        if allow_single_split:
            print("\n" + "*" * 70)
            print(f"WARNING: Running benchmark with single split (tune={len(tune_df)}, test={len(test_df)}).")
            print("Thresholds will be derived on available data. DO NOT USE FOR FORMAL BENCHMARKS.")
            print("*" * 70 + "\n")
            if len(tune_df) == 0:
                tune_df = master_df
            if len(test_df) == 0:
                test_df = master_df
        else:
            raise ValueError(
                f"Benchmark requires non-empty 'tune' and 'test' splits (found tune={len(tune_df)}, test={len(test_df)}). "
                "Pass --allow-single-split for debugging."
            )

    # Optimize threshold on tune_df for each base method
    optimal_thresholds = {}
    base_methods = ["phash", "dhash", "ahash", "whash", "clip", "dino"]

    for m in base_methods:
        m_tune = tune_df[tune_df["method"] == m]
        if len(m_tune) == 0:
            optimal_thresholds[m] = 8.0 if "hash" in m else 0.90
            continue

        y_true = m_tune["is_true_copy"].to_numpy().astype(int)
        scores = m_tune["score"].to_numpy()

        best_f1 = -1.0
        best_t = 8.0 if "hash" in m else 0.90

        if "hash" in m:
            for t in range(65):
                y_pred = (scores <= t).astype(int)
                f1 = f1_score(y_true, y_pred, zero_division=0)
                if f1 > best_f1:
                    best_f1 = f1
                    best_t = float(t)
        else:
            for t in np.linspace(0.0, 1.0, 101):
                y_pred = (scores >= t).astype(int)
                f1 = f1_score(y_true, y_pred, zero_division=0)
                if f1 > best_f1:
                    best_f1 = f1
                    best_t = float(t)

        optimal_thresholds[m] = best_t
        print(f"Optimal threshold for {m} (from tune): {best_t} (F1 = {best_f1:.4f})")

    # Cascade fixed threshold
    optimal_thresholds["cascade"] = 1.0

    # All methods to include in metrics
    all_methods = ["phash", "dhash", "ahash", "whash", "clip", "dino", "cascade"]

    # =========================================================================
    # Step 5: Compute Test Set Metrics
    # =========================================================================
    metrics_records = []
    by_transform_list = []

    for m in all_methods:
        thresh = optimal_thresholds[m]
        m_test = test_df[test_df["method"] == m]

        if len(m_test) > 0:
            y_true = m_test["is_true_copy"].to_numpy().astype(int)
            scores = m_test["score"].to_numpy()

            if m == "cascade":
                y_pred = scores.astype(int)
                auc_score = scores
            elif "hash" in m:
                y_pred = (scores <= thresh).astype(int)
                auc_score = -scores
            else:
                y_pred = (scores >= thresh).astype(int)
                auc_score = scores

            prec = float(precision_score(y_true, y_pred, zero_division=0))
            rec = float(recall_score(y_true, y_pred, zero_division=0))
            f1 = float(f1_score(y_true, y_pred, zero_division=0))
            acc = float(accuracy_score(y_true, y_pred))

            try:
                auc = float(roc_auc_score(y_true, auc_score)) if len(np.unique(y_true)) > 1 else 1.0
            except Exception:  # noqa: BLE001
                auc = 1.0

            med_lat = float(np.median(m_test["latency_ms"]))

            metrics_records.append({
                "run_id": run_id,
                "method": m,
                "category": "all",
                "transform": "all",
                "strength": "all",
                "threshold": thresh,
                "precision": prec,
                "recall": rec,
                "f1": f1,
                "accuracy": acc,
                "roc_auc": auc,
                "median_latency_ms": med_lat,
                "n_pairs": len(m_test),
            })

        # Breakdown per transform and strength
        groups = m_test.groupby(["transform", "strength"], dropna=False)
        for (t_name, s_name), group in groups:
            if len(group) == 0:
                continue
            y_true = group["is_true_copy"].to_numpy().astype(int)
            scores = group["score"].to_numpy()

            if m == "cascade":
                y_pred = scores.astype(int)
                auc_score = scores
            elif "hash" in m:
                y_pred = (scores <= thresh).astype(int)
                auc_score = -scores
            else:
                y_pred = (scores >= thresh).astype(int)
                auc_score = scores

            prec = float(precision_score(y_true, y_pred, zero_division=0))
            rec = float(recall_score(y_true, y_pred, zero_division=0))
            f1 = float(f1_score(y_true, y_pred, zero_division=0))
            acc = float(accuracy_score(y_true, y_pred))

            try:
                auc = float(roc_auc_score(y_true, auc_score)) if len(np.unique(y_true)) > 1 else 1.0
            except Exception:  # noqa: BLE001
                auc = 1.0

            med_lat = float(np.median(group["latency_ms"]))

            t_val = str(t_name)
            s_val = str(s_name)

            if t_val == "none":
                cat_val = "identity" if any(group["is_true_copy"]) else "hard_negative"
            else:
                cat_val = "transform"

            rec_dict = {
                "run_id": run_id,
                "method": m,
                "category": cat_val,
                "transform": t_val,
                "strength": s_val,
                "threshold": thresh,
                "precision": prec,
                "recall": rec,
                "f1": f1,
                "accuracy": acc,
                "roc_auc": auc,
                "median_latency_ms": med_lat,
                "n_pairs": len(group),
            }
            metrics_records.append(rec_dict)

            by_transform_list.append({
                "transform": t_val,
                "strength": s_val,
                "method": m,
                "threshold": thresh,
                "precision": prec,
                "recall": rec,
                "f1": f1,
                "accuracy": acc,
                "roc_auc": auc,
                "median_latency_ms": med_lat,
                "n_pairs": len(group),
            })

    metrics_df = pd.DataFrame(metrics_records)
    metrics_csv_path = results_dir / "metrics.csv"
    metrics_df.to_csv(metrics_csv_path, index=False)
    print(f"Saved metrics -> {metrics_csv_path} ({len(metrics_df)} rows)")

    # =========================================================================
    # Step 6: Cascade Summary & JSON Export
    # =========================================================================
    casc_test = test_df[test_df["method"] == "cascade"]
    if len(casc_test) > 0:
        casc_y_true = casc_test["is_true_copy"].to_numpy().astype(int)
        casc_y_pred = casc_test["score"].to_numpy().astype(int)
        cascade_acc = float(accuracy_score(casc_y_true, casc_y_pred))
        cascade_mean_lat = float(np.mean(casc_test["latency_ms"]))
    else:
        cascade_acc = 1.0
        cascade_mean_lat = 0.0

    escalation_rate = float(test_escalated_count / test_scored_count) if test_scored_count > 0 else 0.0

    summary_data = {
        "run_id": run_id,
        "split": "test",
        "n_originals": int(manifest_df["original_id"].nunique()),
        "n_hard_negatives": int(manifest_df["neg_id"].nunique()),
        "methods": all_methods,
        "by_transform": by_transform_list,
        "scenarios": [],
        "cascade": {
            "accuracy": cascade_acc,
            "mean_latency_ms": cascade_mean_lat,
            "escalation_rate": escalation_rate,
        },
    }

    # Validate against Pydantic schema
    BenchmarkSummary.model_validate(summary_data)

    summary_json_path = results_dir / "summary.json"
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)
    print(f"Saved summary JSON -> {summary_json_path}")

    # =========================================================================
    # Step 7: Generate Visualizations with Tuned Thresholds
    # =========================================================================
    generate_plots(test_df, results_dir, all_methods, optimal_thresholds)

    # =========================================================================
    # Step 8: Database Persistence (Fast Batch Upsert)
    # =========================================================================
    if write_db:
        persist_to_database(master_df, metrics_df, settings.database_url, settings.vector_schema)

    return master_df, metrics_df, summary_data


# =============================================================================
# Plotting Utilities
# =============================================================================

def generate_plots(test_df: pd.DataFrame, results_dir: Path, methods: list[str], optimal_thresholds: dict[str, float]):
    """Generate and save ROC curves, recall heatmap, and latency plots."""
    print("Generating benchmark visualization plots...")
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")

    # 1. Combined ROC plot (roc_all.png) and individual ROC plots (roc_<method>.png)
    plt.figure(figsize=(8, 6))
    for m in methods:
        m_data = test_df[test_df["method"] == m]
        if len(m_data) == 0:
            continue
        y_true = m_data["is_true_copy"].to_numpy().astype(int)
        scores = m_data["score"].to_numpy()
        auc_score = -scores if "hash" in m else scores

        if len(np.unique(y_true)) > 1:
            fpr, tpr, _ = roc_curve(y_true, auc_score)
            auc = roc_auc_score(y_true, auc_score)
            plt.plot(fpr, tpr, label=f"{m} (AUC={auc:.3f})")

            # Individual plot
            plt.figure(figsize=(6, 5))
            plt.plot(fpr, tpr, color="darkorange", lw=2, label=f"ROC (AUC={auc:.3f})")
            plt.plot([0, 1], [0, 1], color="navy", lw=1, linestyle="--")
            plt.xlabel("False Positive Rate")
            plt.ylabel("True Positive Rate")
            plt.title(f"ROC Curve - {m.upper()}")
            plt.legend(loc="lower right")
            plt.tight_layout()
            plt.savefig(results_dir / f"roc_{m}.png", dpi=200)
            plt.close()

    plt.plot([0, 1], [0, 1], color="gray", lw=1, linestyle="--")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Comparison Across Methods")
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(results_dir / "roc_all.png", dpi=200)
    plt.close()

    # 2. Latency Plot (latency.png)
    plt.figure(figsize=(9, 5))
    lat_data = []
    labels = []
    for m in methods:
        sub = test_df[test_df["method"] == m]
        if len(sub) > 0:
            lat_data.append(sub["latency_ms"].to_numpy())
            labels.append(m)

    if lat_data:
        plt.boxplot(lat_data, tick_labels=labels, showmeans=True)
        plt.yscale("log")
        plt.ylabel("Latency (ms) - Log Scale")
        plt.title("Execution Latency Distribution per Method")
        plt.tight_layout()
        plt.savefig(results_dir / "latency.png", dpi=200)
    plt.close()

    # 3. Recall Heatmap (heatmap_recall.png) with Tuned Thresholds and Cascade Row
    try:
        grouped = test_df[test_df["method"].isin(methods)].groupby(
            ["method", "transform", "strength"], dropna=False
        )
        recall_map = {}
        for (m, t, s), grp in grouped:
            t_str = str(t)
            s_str = str(s)
            label = "none" if t_str == "none" else f"{t_str}_{s_str}"

            y_t = grp["is_true_copy"].to_numpy().astype(int)
            sc = grp["score"].to_numpy()

            thresh = optimal_thresholds.get(m, 8.0 if "hash" in m else 0.90)
            if m == "cascade":
                y_p = sc.astype(int)
            elif "hash" in m:
                y_p = (sc <= thresh).astype(int)
            else:
                y_p = (sc >= thresh).astype(int)

            rec = float(recall_score(y_t, y_p, zero_division=0)) if len(y_t) > 0 else 0.0
            if m not in recall_map:
                recall_map[m] = {}
            recall_map[m][label] = rec

        heat_df = pd.DataFrame(recall_map)
        if not heat_df.empty:
            plt.figure(figsize=(10, max(6, len(heat_df) * 0.4)))
            plt.imshow(heat_df.values, cmap="viridis", aspect="auto", vmin=0, vmax=1)
            plt.colorbar(label="Recall")
            plt.xticks(range(len(heat_df.columns)), heat_df.columns, rotation=45, ha="right")
            plt.yticks(range(len(heat_df.index)), heat_df.index)
            plt.title("Recall Breakdown by Attack Transformation (Tuned Thresholds)")
            plt.tight_layout()
            plt.savefig(results_dir / "heatmap_recall.png", dpi=200)
            plt.close()
    except Exception as e:  # noqa: BLE001
        print(f"Warning: could not render heatmap_recall.png: {e}")


# =============================================================================
# Fast Batch Database Upsert
# =============================================================================

def persist_to_database(
    master_df: pd.DataFrame,
    metrics_df: pd.DataFrame,
    db_url: str,
    vector_schema: str = "public",
    chunk_size: int = 1000,
):
    """Fast batch upsert benchmark_runs and benchmark_metrics rows to PostgreSQL."""
    print("Writing benchmark records to PostgreSQL database in batches...")
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg://")
    engine = make_sync_engine(sync_url, vector_schema=vector_schema)

    # 1. Prepare benchmark_runs parameter dicts
    runs_rows = []
    for _, r in master_df.iterrows():
        runs_rows.append({
            "run_id": str(r["run_id"]),
            "split": str(r["split"]),
            "category": str(r["category"]),
            "original_id": str(r["original_id"]),
            "query_file": str(r["query_file"]),
            "transform": str(r["transform"]),
            "strength": str(r["strength"]),
            "is_true_copy": bool(r["is_true_copy"]),
            "method": str(r["method"]),
            "score": float(r["score"]),
            "score_kind": str(r["score_kind"]),
            "latency_ms": float(r["latency_ms"]),
        })

    # 2. Prepare benchmark_metrics parameter dicts
    metrics_rows = []
    for _, m in metrics_df.iterrows():
        metrics_rows.append({
            "run_id": str(m["run_id"]),
            "method": str(m["method"]),
            "category": str(m["category"]),
            "transform": str(m["transform"]),
            "strength": str(m["strength"]),
            "threshold": float(m["threshold"]) if pd.notna(m["threshold"]) else None,
            "precision": float(m["precision"]) if pd.notna(m["precision"]) else None,
            "recall": float(m["recall"]) if pd.notna(m["recall"]) else None,
            "f1": float(m["f1"]) if pd.notna(m["f1"]) else None,
            "accuracy": float(m["accuracy"]) if pd.notna(m["accuracy"]) else None,
            "roc_auc": float(m["roc_auc"]) if pd.notna(m["roc_auc"]) else None,
            "median_latency_ms": float(m["median_latency_ms"]) if pd.notna(m["median_latency_ms"]) else None,
            "n_pairs": int(m["n_pairs"]),
        })

    with engine.begin() as conn:
        # Executemany benchmark_runs in chunks
        insert_runs_sql = text("""
        INSERT INTO benchmark_runs (
            run_id, split, category, original_id, query_file,
            transform, strength, is_true_copy, method, score, score_kind,
            latency_ms, created_at
        ) VALUES (
            :run_id, :split, :category, :original_id, :query_file,
            :transform, :strength, :is_true_copy, :method, :score, :score_kind,
            :latency_ms, now()
        )
        ON CONFLICT (run_id, query_file, original_id, method) DO UPDATE SET
            split = EXCLUDED.split,
            category = EXCLUDED.category,
            transform = EXCLUDED.transform,
            strength = EXCLUDED.strength,
            is_true_copy = EXCLUDED.is_true_copy,
            score = EXCLUDED.score,
            score_kind = EXCLUDED.score_kind,
            latency_ms = EXCLUDED.latency_ms;
        """)

        for i in range(0, len(runs_rows), chunk_size):
            chunk = runs_rows[i:i + chunk_size]
            conn.execute(insert_runs_sql, chunk)

        # Executemany benchmark_metrics in chunks
        insert_metrics_sql = text("""
        INSERT INTO benchmark_metrics (
            run_id, method, category, transform, strength,
            threshold, precision, recall, f1, accuracy, roc_auc,
            median_latency_ms, n_pairs
        ) VALUES (
            :run_id, :method, :category, :transform, :strength,
            :threshold, :precision, :recall, :f1, :accuracy, :roc_auc,
            :median_latency_ms, :n_pairs
        )
        ON CONFLICT (run_id, method, category, transform, strength) DO UPDATE SET
            threshold = EXCLUDED.threshold,
            precision = EXCLUDED.precision,
            recall = EXCLUDED.recall,
            f1 = EXCLUDED.f1,
            accuracy = EXCLUDED.accuracy,
            roc_auc = EXCLUDED.roc_auc,
            median_latency_ms = EXCLUDED.median_latency_ms,
            n_pairs = EXCLUDED.n_pairs;
        """)

        for i in range(0, len(metrics_rows), chunk_size):
            chunk = metrics_rows[i:i + chunk_size]
            conn.execute(insert_metrics_sql, chunk)

    print("Fast batch database upsert completed successfully.")


def main():
    parser = argparse.ArgumentParser(description="Evaluate ProvNet benchmark attack queries")
    parser.add_argument(
        "--data-dir",
        type=str,
        default=None,
        help="Path to benchmark data directory (default: resolves to data/benchmark)",
    )
    parser.add_argument(
        "--run-id",
        type=str,
        default=None,
        help="Benchmark run identifier (default: current date formatted)",
    )
    parser.add_argument(
        "--write-db",
        action="store_true",
        help="Write results and metrics to PostgreSQL database",
    )
    parser.add_argument(
        "--fake-embedder",
        action="store_true",
        help="Use deterministic fast FakeEmbedder for testing without model downloads",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="PyTorch device override (e.g. 'cpu' or 'cuda')",
    )
    parser.add_argument(
        "--allow-single-split",
        action="store_true",
        help="Allow running evaluation on a single split (for debugging/testing only)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=16,
        help="Batch size for embedding extraction (default: 16)",
    )

    args = parser.parse_args()

    if args.data_dir:
        data_dir = Path(args.data_dir)
    else:
        repo_root = Path(__file__).resolve().parent.parent.parent
        data_dir = repo_root / "data" / "benchmark"

    run_id = args.run_id or f"{datetime.now(UTC).strftime('%Y-%m-%d')}_v1"

    try:
        run_evaluation(
            data_dir=data_dir,
            run_id=run_id,
            write_db=args.write_db,
            use_fake_embedder=args.fake_embedder,
            device_override=args.device,
            allow_single_split=args.allow_single_split,
            batch_size=args.batch_size,
        )
    except Exception as e:  # noqa: BLE001
        print(f"Evaluation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
