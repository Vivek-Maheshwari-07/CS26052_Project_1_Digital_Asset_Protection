"""
ProvNet Benchmark Evaluation Engine.
Evaluates all perceptual hashing, deep embedding, and cascade methods across attack queries.
Generates metrics, summary JSON, plots, and optional PostgreSQL database persistence.
"""

import argparse
import json
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score, roc_curve
from sqlalchemy import text

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import get_config, get_settings
from app.core.embedder import Embedder, resolve_device
from app.core.hasher import compute_hashes, hamming
from app.core.ingest import ingest
from app.db import make_sync_engine
from app.schemas import BenchmarkSummary

# =============================================================================
# Helper: Embeddings & Hash Caching
# =============================================================================

def get_image_cache_path(cache_dir: Path, config_version: str, file_stem: str) -> Path:
    target_dir = cache_dir / config_version
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir / f"{file_stem}.npz"


def load_or_compute_image_features(
    img_path: Path,
    cfg,
    embedder,
    cache_dir: Path,
    config_version: str,
) -> tuple[dict, np.ndarray, np.ndarray, float, float]:
    """
    Compute or load hashes and embeddings for an image file.
    Returns: (hashes_dict, clip_vec, dino_vec, hash_latency_ms, embed_latency_ms)
    """
    raw_bytes = img_path.read_bytes()
    ingested = ingest(raw_bytes, cfg.limits)
    img = ingested.image

    # 1. Compute Hashes
    t0 = time.perf_counter()
    h_res = compute_hashes(img, cfg)
    hash_latency_ms = (time.perf_counter() - t0) * 1000.0

    hashes_dict = {
        "phash": h_res.phash,
        "dhash": h_res.dhash,
        "ahash": h_res.ahash,
        "whash": h_res.whash,
        "low_detail": h_res.low_detail,
        "grey_std": h_res.grey_std,
    }

    # 2. Embeddings (with disk cache)
    cache_file = get_image_cache_path(cache_dir, config_version, img_path.stem)
    if cache_file.exists():
        try:
            with np.load(cache_file) as data:
                clip_vec = data["clip"]
                dino_vec = data["dino"]
                embed_latency_ms = float(data.get("latency_ms", 0.0))
                return hashes_dict, clip_vec, dino_vec, hash_latency_ms, embed_latency_ms
        except Exception:  # noqa: BLE001, S110
            pass

    # Extract embeddings
    t0 = time.perf_counter()
    clip_vec, dino_vec = embedder.embed(img)
    embed_latency_ms = (time.perf_counter() - t0) * 1000.0

    # Save to cache
    np.savez_compressed(
        cache_file,
        clip=clip_vec.astype(np.float32),
        dino=dino_vec.astype(np.float32),
        latency_ms=embed_latency_ms,
    )

    return hashes_dict, clip_vec, dino_vec, hash_latency_ms, embed_latency_ms


# =============================================================================
# Core Benchmark Runner
# =============================================================================

def run_evaluation(
    data_dir: Path,
    run_id: str,
    write_db: bool = False,
    use_fake_embedder: bool = False,
    device_override: str | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    cfg = get_config()
    settings = get_settings()

    # Determine embedder
    if use_fake_embedder:
        from tests.fakes import FakeEmbedder
        embedder = FakeEmbedder()
    else:
        dev = device_override or resolve_device(cfg.models.device)
        embedder = Embedder(cfg.models, dev)
        embedder.warm_up()

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
    print(f"Manifest: {len(manifest_df)} pairs | Queries: {len(queries_df)} items")

    # Preload/cache original image features
    print("Pre-extracting features for original images...")
    orig_features = {}
    for orig_id in manifest_df["original_id"].unique():
        orig_files = list(orig_dir.glob(f"{orig_id}.*"))
        if not orig_files:
            continue
        orig_features[orig_id] = load_or_compute_image_features(
            orig_files[0], cfg, embedder, cache_dir, config_version
        )

    # Score each query pair
    print("Scoring all query items...")
    master_records = []
    cascade_escalations = 0

    for _, row in queries_df.iterrows():
        q_file = str(row["query_file"])
        orig_id = str(row["original_id"])
        split = str(row["split"])
        transform = str(row["transform"])
        strength = str(row["strength"])
        is_true_copy = bool(row["is_true_copy"])
        category = "hard_negative" if transform == "none" else "transform"

        if orig_id not in orig_features:
            continue

        orig_h, orig_clip, orig_dino, orig_h_lat, orig_e_lat = orig_features[orig_id]

        q_path = queries_dir / q_file
        if not q_path.exists():
            continue

        q_h, q_clip, q_dino, q_h_lat, q_e_lat = load_or_compute_image_features(
            q_path, cfg, embedder, cache_dir, config_version
        )

        # Average pair latencies
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
                "transform": transform if transform != "none" else None,
                "strength": strength if strength != "none" else None,
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
            "transform": transform if transform != "none" else None,
            "strength": strength if strength != "none" else None,
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
            "transform": transform if transform != "none" else None,
            "strength": strength if strength != "none" else None,
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
        else:
            cascade_escalations += 1
            if cos_dino >= cfg.cascade.dino_cosine_match_min:
                cascade_decision = 1.0
            else:
                cascade_decision = 0.0
            cascade_lat = h_lat + e_lat

        master_records.append({
            "run_id": run_id,
            "split": split,
            "category": category,
            "original_id": orig_id,
            "query_file": q_file,
            "transform": transform if transform != "none" else None,
            "strength": strength if strength != "none" else None,
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
    # Metrics Computation
    # =========================================================================
    print("Computing metrics and optimizing thresholds on 'tune' split...")
    tune_df = master_df[master_df["split"] == "tune"]
    test_df = master_df[master_df["split"] == "test"]

    # If dataset has only one split (or tune is empty), fallback safely
    if len(tune_df) == 0:
        tune_df = master_df
    if len(test_df) == 0:
        test_df = master_df

    # Optimize threshold on tune_df for each method
    optimal_thresholds = {}
    methods = ["phash", "dhash", "ahash", "whash", "clip", "dino"]

    for m in methods:
        m_tune = tune_df[tune_df["method"] == m]
        if len(m_tune) == 0:
            optimal_thresholds[m] = 8.0 if "hash" in m else 0.90
            continue

        y_true = m_tune["is_true_copy"].to_numpy().astype(int)
        scores = m_tune["score"].to_numpy()

        best_f1 = -1.0
        best_t = 8.0 if "hash" in m else 0.90

        if "hash" in m:
            # Grid search hamming thresholds 0 to 64
            for t in range(65):
                y_pred = (scores <= t).astype(int)
                f1 = f1_score(y_true, y_pred, zero_division=0)
                if f1 > best_f1:
                    best_f1 = f1
                    best_t = float(t)
        else:
            # Grid search cosine thresholds 0.00 to 1.00
            for t in np.linspace(0.0, 1.0, 101):
                y_pred = (scores >= t).astype(int)
                f1 = f1_score(y_true, y_pred, zero_division=0)
                if f1 > best_f1:
                    best_f1 = f1
                    best_t = float(t)

        optimal_thresholds[m] = best_t
        print(f"Optimal threshold for {m} (from tune): {best_t} (F1 = {best_f1:.4f})")

    # Compute metrics on test_df
    metrics_records = []
    by_transform_list = []

    for m in methods:
        thresh = optimal_thresholds[m]
        m_test = test_df[test_df["method"] == m]

        # 1. Overall across all transforms
        if len(m_test) > 0:
            y_true = m_test["is_true_copy"].to_numpy().astype(int)
            scores = m_test["score"].to_numpy()
            y_pred = (scores <= thresh).astype(int) if "hash" in m else (scores >= thresh).astype(int)

            prec = float(precision_score(y_true, y_pred, zero_division=0))
            rec = float(recall_score(y_true, y_pred, zero_division=0))
            f1 = float(f1_score(y_true, y_pred, zero_division=0))
            acc = float(accuracy_score(y_true, y_pred))

            try:
                # For hash, lower distance is more positive, so use -score
                auc_score = -scores if "hash" in m else scores
                auc = float(roc_auc_score(y_true, auc_score)) if len(np.unique(y_true)) > 1 else 1.0
            except Exception:  # noqa: BLE001
                auc = 1.0

            med_lat = float(np.median(m_test["latency_ms"])) if len(m_test) > 0 else 0.0

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

        # 2. Per transform and strength
        groups = m_test.groupby(["transform", "strength"], dropna=False)
        for (t_name, s_name), group in groups:
            if len(group) == 0:
                continue
            y_true = group["is_true_copy"].to_numpy().astype(int)
            scores = group["score"].to_numpy()
            y_pred = (scores <= thresh).astype(int) if "hash" in m else (scores >= thresh).astype(int)

            prec = float(precision_score(y_true, y_pred, zero_division=0))
            rec = float(recall_score(y_true, y_pred, zero_division=0))
            f1 = float(f1_score(y_true, y_pred, zero_division=0))
            acc = float(accuracy_score(y_true, y_pred))

            try:
                auc_score = -scores if "hash" in m else scores
                auc = float(roc_auc_score(y_true, auc_score)) if len(np.unique(y_true)) > 1 else 1.0
            except Exception:  # noqa: BLE001
                auc = 1.0

            med_lat = float(np.median(group["latency_ms"]))

            t_val = str(t_name) if pd.notna(t_name) else "none"
            s_val = str(s_name) if pd.notna(s_name) else "none"

            rec_dict = {
                "run_id": run_id,
                "method": m,
                "category": "hard_negative" if t_val == "none" else "transform",
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
    # Cascade Summary & JSON Export
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

    total_queries = len(queries_df)
    escalation_rate = float(cascade_escalations / total_queries) if total_queries > 0 else 0.0

    summary_data = {
        "run_id": run_id,
        "split": "test",
        "n_originals": int(manifest_df["original_id"].nunique()),
        "n_hard_negatives": int(manifest_df["neg_id"].nunique()),
        "methods": methods,
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
    # Generate Visualizations (Matplotlib)
    # =========================================================================
    generate_plots(test_df, results_dir, methods)

    # =========================================================================
    # Database Persistence (Optional)
    # =========================================================================
    if write_db:
        persist_to_database(master_df, metrics_df, settings.database_url, settings.vector_schema)

    return master_df, metrics_df, summary_data


# =============================================================================
# Plotting Utilities
# =============================================================================

def generate_plots(test_df: pd.DataFrame, results_dir: Path, methods: list[str]):
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
    for m in [*methods, "cascade"]:
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

    # 3. Recall Heatmap (heatmap_recall.png)
    try:
        grouped = test_df[test_df["method"].isin(methods)].groupby(
            ["method", "transform", "strength"], dropna=False
        )
        recall_map = {}
        for (m, t, s), grp in grouped:
            if t is None or pd.isna(t) or t == "none":
                label = "none"
            else:
                label = f"{t}_{s}"
            y_t = grp["is_true_copy"].to_numpy().astype(int)
            sc = grp["score"].to_numpy()
            # Simple heuristic threshold for visual overview
            y_p = (sc <= 8).astype(int) if "hash" in m else (sc >= 0.90).astype(int)
            rec = recall_score(y_t, y_p, zero_division=0) if len(y_t) > 0 else 0.0
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
            plt.title("Recall Breakdown by Attack Transformation")
            plt.tight_layout()
            plt.savefig(results_dir / "heatmap_recall.png", dpi=200)
            plt.close()
    except Exception as e:  # noqa: BLE001
        print(f"Warning: could not render heatmap_recall.png: {e}")


# =============================================================================
# Database Upsert
# =============================================================================

def persist_to_database(
    master_df: pd.DataFrame,
    metrics_df: pd.DataFrame,
    db_url: str,
    vector_schema: str = "public",
):
    """Upsert benchmark_runs and benchmark_metrics rows to PostgreSQL."""
    print("Writing benchmark records to PostgreSQL database...")
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg://")
    engine = make_sync_engine(sync_url, vector_schema=vector_schema)

    with engine.begin() as conn:
        # Upsert benchmark_runs
        for _, r in master_df.iterrows():
            conn.execute(
                text("""
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
                    score = EXCLUDED.score,
                    latency_ms = EXCLUDED.latency_ms;
                """),
                {
                    "run_id": r["run_id"],
                    "split": r["split"],
                    "category": r["category"],
                    "original_id": r["original_id"],
                    "query_file": r["query_file"],
                    "transform": r["transform"],
                    "strength": r["strength"],
                    "is_true_copy": bool(r["is_true_copy"]),
                    "method": r["method"],
                    "score": float(r["score"]),
                    "score_kind": r["score_kind"],
                    "latency_ms": float(r["latency_ms"]),
                }
            )

        # Upsert benchmark_metrics
        for _, m in metrics_df.iterrows():
            conn.execute(
                text("""
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
                """),
                {
                    "run_id": m["run_id"],
                    "method": m["method"],
                    "category": m["category"],
                    "transform": m["transform"],
                    "strength": m["strength"],
                    "threshold": float(m["threshold"]) if pd.notna(m["threshold"]) else None,
                    "precision": float(m["precision"]) if pd.notna(m["precision"]) else None,
                    "recall": float(m["recall"]) if pd.notna(m["recall"]) else None,
                    "f1": float(m["f1"]) if pd.notna(m["f1"]) else None,
                    "accuracy": float(m["accuracy"]) if pd.notna(m["accuracy"]) else None,
                    "roc_auc": float(m["roc_auc"]) if pd.notna(m["roc_auc"]) else None,
                    "median_latency_ms": float(m["median_latency_ms"]) if pd.notna(m["median_latency_ms"]) else None,
                    "n_pairs": int(m["n_pairs"]),
                }
            )

    print("Database upsert completed successfully.")


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
        )
    except Exception as e:  # noqa: BLE001
        print(f"Evaluation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
