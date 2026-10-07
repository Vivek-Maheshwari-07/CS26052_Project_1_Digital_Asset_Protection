"""
Generate manifest.csv from original and hard_negative image directories.
Pairs images in sorted order and assigns deterministic 'tune' vs 'test' splits.
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def find_image_files(directory: Path) -> list[Path]:
    """Find all valid image files in a directory sorted by stem name."""
    if not directory.exists():
        return []
    files = [
        p for p in directory.iterdir()
        if p.is_file() and p.suffix.lower() in ALLOWED_EXTENSIONS
    ]
    return sorted(files, key=lambda p: p.stem)


def create_manifest(
    data_dir: Path,
    tune_ratio: float = 0.3,
    seed: int = 42,
) -> pd.DataFrame:
    """Build manifest dataframe pairing originals and hard negatives with seeded split."""
    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"

    orig_files = find_image_files(orig_dir)
    neg_files = find_image_files(neg_dir)

    if not orig_files:
        raise ValueError(f"No original images found in {orig_dir}")
    if len(orig_files) != len(neg_files):
        raise ValueError(
            f"Image count mismatch: found {len(orig_files)} originals and {len(neg_files)} hard negatives."
        )

    orig_ids = [p.stem for p in orig_files]
    neg_ids = [p.stem for p in neg_files]

    # Assign split per original using seeded permutation
    rng = np.random.default_rng(seed)
    n = len(orig_ids)
    n_tune = max(1, round(n * tune_ratio)) if n > 1 else 1

    # Shuffle indices to pick tune set
    indices = np.arange(n)
    rng.shuffle(indices)
    tune_indices = set(indices[:n_tune])

    splits = ["tune" if i in tune_indices else "test" for i in range(n)]

    df = pd.DataFrame({
        "original_id": orig_ids,
        "neg_id": neg_ids,
        "split": splits,
    })

    out_csv = data_dir / "manifest.csv"
    df.to_csv(out_csv, index=False)
    print(f"Manifest written to {out_csv} ({len(df)} pairs: {sum(df['split'] == 'tune')} tune, {sum(df['split'] == 'test')} test)")
    return df


def main():
    parser = argparse.ArgumentParser(description="Create manifest.csv for benchmark dataset")
    parser.add_argument(
        "--data-dir",
        type=str,
        default=None,
        help="Path to benchmark data directory (default: resolves to data/benchmark)",
    )
    parser.add_argument(
        "--tune-ratio",
        type=float,
        default=0.3,
        help="Fraction of dataset to allocate to 'tune' split (default: 0.3)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for deterministic split assignment (default: 42)",
    )

    args = parser.parse_args()

    if args.data_dir:
        data_dir = Path(args.data_dir)
    else:
        # Resolve data/benchmark relative to project root
        repo_root = Path(__file__).resolve().parent.parent.parent
        data_dir = repo_root / "data" / "benchmark"

    try:
        create_manifest(data_dir=data_dir, tune_ratio=args.tune_ratio, seed=args.seed)
    except Exception as e:  # noqa: BLE001
        print(f"Error creating manifest: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
