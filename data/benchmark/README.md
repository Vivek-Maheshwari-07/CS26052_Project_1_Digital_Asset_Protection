# ProvNet Benchmark Dataset

This directory contains the dataset used for offline evaluation and robustness benchmarking of the ProvNet digital asset protection cascade.

## Directory Structure

```
data/benchmark/
  originals/        <original_id>.jpg       (100 original master images)
  hard_negatives/   <neg_id>.jpg            (100 similar-looking but DIFFERENT photos)
  manifest.csv      original_id,neg_id,split
  queries/          <source_id>__<transform>__<strength>.png
  queries.csv       Metadata for generated query images
  cache/            Cached embeddings per config version
  results/          Evaluation metrics, summaries, and plots
```

## Adding Images

1. Place 100 original images into `data/benchmark/originals/` (JPEG, PNG, or WebP).
2. Place 100 paired hard negatives into `data/benchmark/hard_negatives/` (different photos with similar subject/composition/style).
3. Generate the pairing and train/test split manifest by running:
   ```bash
   cd backend
   python -m bench.make_manifest
   ```
   This automatically pairs originals and hard negatives in alphabetical order and assigns `split="tune"` (30%) vs `split="test"` (70%) deterministically using seed 42.

## Running the Benchmark Pipeline

1. **Generate Attacks & Queries:**
   ```bash
   cd backend
   python -m bench.attack
   ```
2. **Execute Full Evaluation & Generate Metrics:**
   ```bash
   cd backend
   python -m bench.evaluate --run-id "2026-10-07_v1"
   ```
   To also persist the evaluation runs and metrics into the PostgreSQL database:
   ```bash
   python -m bench.evaluate --run-id "2026-10-07_v1" --write-db
   ```
