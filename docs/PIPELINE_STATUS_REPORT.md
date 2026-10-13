# Digital Asset Provenance: Detection Pipeline Status Report

Snapshot date: 2026-10-05. Pipeline version string: `phash+clip-vitb32-centercrop-v2`.
Everything below was measured on the code in this repository; where a number comes from a
single case or a small set, that is stated.

---

## 1. What the system is for

A web platform where independent creators (illustrators, photographers) **register** an
original image and later **check** a suspected copy found online. The system must:

- detect copies that were cropped, flipped, rotated, filtered, recompressed, or AI-edited;
- not flag unrelated images that merely look similar;
- give a confidence score and an explanation, not a bare yes/no;
- keep a tamper-evident, timestamped record proving who registered first.

**The open problem** (Sections 7-9): similarity matching fails on heavily AI-edited copies, and
it over-rewards "same background / pose / composition" even when the content is different.

---

## 2. System at a glance

| Layer | What we use |
|---|---|
| API | FastAPI (Python 3.13), JWT auth, email OTP sign-up |
| Database | MongoDB (users, works, checks, otp_requests) |
| Image storage | Local disk, `backend/uploads/` (originals) and `uploads/checks/` (suspect images) |
| Classical fingerprint | `imagehash.phash` (64-bit DCT perceptual hash) |
| Learned fingerprint | OpenCLIP **ViT-B/32**, weights `laion2b_s34b_b79k`, 512-d L2-normalised image embedding |
| Search | In-memory NumPy index (brute force, vectorised) |
| Score fusion | Logistic regression over (embedding similarity, pHash similarity) |
| Integrity | SHA-256 hash chain over each registration; entry hash anchored in Bitcoin via OpenTimestamps |
| Certificate | PDF with QR code linking to a public verification page |
| Hardware | CPU only (torch 2.14.0+cpu, 6 threads). No GPU. |
| Frontend | React + Vite (out of scope for this report) |

---

## 3. The detection pipeline, step by step

Used identically for **register** (new work) and **check** (suspected copy).

### Step 1: Ingestion (`app/ingestion.py`)
1. Reject files over 20 MB.
2. Decode with Pillow; verify; convert Pillow's decompression-bomb error into a clean 400
   (Pillow's own limit is about 89 million pixels).
3. **Apply EXIF orientation** (`ImageOps.exif_transpose`) so the image is processed the way it
   is displayed.
4. Convert to **RGB**.

Not done: no padding, no resizing, no metadata stripping in storage (original bytes are stored
unchanged, so EXIF/GPS in uploads is still retained on disk), no real ICC colour management.

### Step 2: Classical fingerprint (`app/fingerprint/phash.py`)
- `imagehash.phash(image)`: default `hash_size=8`, so a 64-bit hash from the low-frequency
  8x8 block of a 32x32 DCT of the grayscale image. imagehash resizes the **whole frame** to
  32x32 **without preserving aspect ratio**.
- Similarity = `1 - HammingDistance / 64`.
- A **low-detail flag** (RMS adjacent-pixel difference on a 128x128 grayscale copy is below 6.0)
  is computed and stored. It does **not** affect the score; it is only surfaced as a caveat.
  Calibration points: real photos 24.7-34.4, simple logo 12.5, blank/gradient 0-1.6.

### Step 3: Learned fingerprint (`app/fingerprint/embedding.py`)
- OpenCLIP ViT-B/32, loaded once. Preprocessing is CLIP's own:
  `Resize(224, bicubic, antialias)` on the **short side**, then **`CenterCrop(224x224)`**,
  then CLIP mean/std normalisation.
- fp32 inference (no autocast). About 224 ms per image on this CPU.
  (An earlier version used CPU autocast and took about 1,534 ms: roughly 7x slower with a
  cosine difference of only 0.998 against fp32.)
- Output is L2-normalised; similarity is the dot product.
- **Consequence of CenterCrop:** a tall portrait (the 558x1280 test original) is resized to
  224x514 and cropped to the middle 224x224, discarding about 56% of the height. pHash sees the
  whole frame; the embedding does not.
- A semaphore (2 concurrent) limits simultaneous model calls under load.

### Step 4: Search (`app/registry/index.py`)
- All embeddings in one float32 matrix (n x 512); all pHashes as an unpacked bit matrix (n x 64).
- Per query: `emb_sim = E @ q`; `phash_sim = 1 - (bits != q_bits).sum(axis=1) / 64`; fuse; take
  top-k by `argpartition`. Rebuilt from MongoDB when the stored work count changes.
- Exact (not approximate) search. Fine for thousands to low hundreds of thousands of works.

### Step 5: Score fusion (`app/fingerprint/combine.py`)
```
confidence = sigmoid( 27.887 * embedding_sim + 13.085 * phash_sim - 25.773 )
likely_match   if confidence >= 0.996
possible_match if confidence >= 0.27
no_match       otherwise
```
- Weights fitted by Newton/IRLS logistic regression (balanced class weights, L2 = 1e-3) on the
  evaluation set in Section 5, **5-fold cross-validated with folds grouped by original image**
  (a test query's original never appears in training).
- Thresholds: `likely` = the 99.9th percentile of cross-validated *unrelated-pair* scores (0.1%
  false-positive rate); `possible` = the 99th percentile (1% FPR).
- The previous hand-tuned fusion `max(0.75*min(1, 1.25*emb) + 0.25*phash, emb)` is kept in the
  evaluation as a baseline. Its mean score for **unrelated** images was 0.477 against a 0.5
  "possible" cut-off, so it produced false "possible" matches; the logistic fusion drops that
  mean to 0.010.

### Step 6: Registration-time duplicate gate (`app/api/register.py`)
A new upload is refused if any of its top-3 nearest registered works has
`embedding_sim >= 0.95` **or** `phash_sim >= 0.90`. If the match is the same user's, they may
override; if it is another creator's, they cannot, and the other creator's image/title are
not revealed. **These two thresholds were not calibrated by the evaluation.**

### Step 7: Registry integrity
- Each registration is hashed: SHA-256 over canonical JSON of `id, owner_name, title, phash,
  embedding (full vector), created_at, prev_hash` (+ optional `user_id, pipeline_version,
  low_detail`). `prev_hash` links to the previous entry (genesis = `"GENESIS"`).
- The entry hash is submitted to OpenTimestamps calendars; the returned proof is stored and
  downloadable (`.ots`), verifiable with the standard client. Status stays "pending" in-app;
  the app does not yet upgrade/confirm proofs.
- Public endpoint re-verifies a record and the whole chain.

---

## 4. Components in the original proposal vs. what exists

| Proposed | Built | Notes |
|---|---|---|
| Ingestion module (sniffing, bomb guard, EXIF, sRGB, metadata strip) | Partly | EXIF, RGB, bomb guard done; no metadata stripping, no ICC handling |
| 4 classical hashes (pHash, dHash, aHash, wHash) + low-detail flag | pHash + flag only | The other three were tested and rejected (Section 6.3) |
| CLIP **and DINOv2**, pad-to-square, semaphore | CLIP only, center-crop, semaphore | Pad-to-square tested and rejected (6.1). **DINOv2 not yet tried.** |
| PostgreSQL + pgvector + HNSW | MongoDB + in-memory NumPy | Deliberately deferred |
| `config.yaml`, version recorded per verification | `.env` settings; `pipeline_version` string stored per work and per check | Weights/thresholds themselves are not snapshotted per check |
| Benchmark runner (`attack.py`, `evaluate.py`) | One script, `backend/eval/evaluate.py` | Writes CSV/JSON/PNG, not a database table |

---

## 5. Evaluation methodology

- **Originals:** 40 photographs, 800x600, downloaded from Lorem Picsum. Diverse content.
- **21 programmatic edits** per original (840 edited copies):
  JPEG q30 and q10; resize to 25%; centre crop 10/25/40%; offset crop 30%; rotate 5 and 15
  degrees; horizontal flip; Gaussian blur r3; brightness +40%; contrast x1.6; saturation x2;
  grayscale; Gaussian noise sigma 20; text/banner overlay; letterbox; combo (crop 20% +
  saturation + JPEG q40); and two **simulated** "AI" edits (`sim_ai_painterly`: smooth/posterise/
  edge-enhance; `sim_ai_restyle`: colour remap + detail filter).
- **Positives:** each copy against its own original (840). **Negatives:** each copy against the
  other 39 originals (**32,760** pairs).
- **Metrics:** AUC; TPR at 1% and 0.1% FPR; top-1 retrieval accuracy.
- **Caveats:** the "AI" edits are image-processing filters, **not generative-model output**.
  Negatives are *different* photos, so they are far easier than real look-alikes (same
  landmark, same scene). 40 originals is a small set. No real AI-edited copies are in it.

---

## 6. Results

### 6.1 Overall (40 originals, 840 copies, 32,760 negatives)

| Method | AUC | TPR @ 1% FPR | TPR @ 0.1% FPR | Top-1 | Mean score: copy / unrelated |
|---|---|---|---|---|---|
| pHash | 0.9032 | 72.9% | 65.7% | 73.8% | 0.826 / 0.511 |
| Embedding (CLIP) | 0.9991 | 99.3% | 92.3% | 99.5% | 0.892 / 0.372 |
| Old heuristic fusion | 0.9996 | 99.6% | 93.5% | 99.6% | 0.959 / 0.477 |
| **Logistic fusion (5-fold CV), in use** | 0.9992 | 99.4% | 89.6% | 99.8% | 0.988 / 0.010 |

At the in-use `likely` threshold (0.996): 89.6% of edited copies caught, 0.10% of unrelated
pairs flagged. At `possible` (0.27): 99.4% caught, 1.00% flagged.

### 6.2 Where pHash fails and the embedding does not (TPR @ 1% FPR)

| Edit | pHash | Embedding |
|---|---|---|
| horizontal flip | **0.0%** | 100% |
| crop offset 30% | **7.5%** | 100% |
| crop 40% | **10.0%** | 100% |
| rotate 15 degrees | **10.0%** | 97.5% |
| letterbox | **12.5%** | 100% |
| crop 25% | 42.5% | 100% |
| combo crop+filter+JPEG | 70.0% | 100% |
| rotate 5 degrees | 75.0% | 100% |
| JPEG, resize, blur, noise, contrast, saturation, grayscale, both `sim_ai_*` | about 100% | about 100% |

The embedding is at or above 97.5% for every edit (lowest: brightness +40, text overlay,
rotate 15). The fused score matches it except crop 40% (95.0%).

### 6.3 Real-world case study (the case that motivates the research)

One real photo (a toddler on a patterned carpet, **558x1280 portrait**) is the registered
original. Four 1144x1375 images are tested against it. Reproduced on the current code on
2026-10-05:

| Test image | pHash sim | Embedding sim | Fused confidence | Verdict now |
|---|---|---|---|---|
| Minimal AI edit (same pose, floor, outfit) | 0.6250 | 0.8281 | 0.9959 | **possible_match** |
| Medium AI edit (new room, plant, armchair, seated pose) | 0.5625 | 0.7094 | 0.7973 | possible_match |
| Heavy AI edit (new scene, glasses, adult added, new outfit) | 0.4688 | 0.5171 | 0.0054 | **no_match** |
| Real photo, same background/pose/outfit, **older child added** | 0.5000 | 0.8097 | 0.9661 | possible_match |

Observations:
- **The easiest case sits 0.0001 below the `likely` threshold** (0.9959 vs 0.996) and is shown
  as `possible_match`. The threshold came from a 40-photo synthetic set, so this margin is not
  trustworthy in either direction.
- **Failure mode 1 (heavy AI edit):** fused confidence 0.0054. The embedding similarity (0.517)
  is above the unrelated-image mean (0.372) but far below the copy mean (0.892), so there is
  residual signal that the logistic model squashes to near zero.
- **Failure mode 2 (added person, same scene):** 0.9661 confidence, higher than the genuinely
  edited *medium* case (0.7973). The scores reward shared background, pose and framing, not
  shared content. This case is legitimately a different photograph.
- Each row is a single image pair (n = 1 per row, one original). It is a diagnostic, not a
  benchmark.

---

## 7. Experiments tried and rejected (all on the case-study images)

### 7.1 Pad-to-square preprocessing for CLIP (proposed in the original design)
Pad the image to a square with grey (CLIP mean colour) instead of center-cropping. Embedding
similarity against the original, centre-crop vs pad:

| Test image | Centre-crop | Pad-to-square | Change |
|---|---|---|---|
| Minimal edit | 0.8281 | 0.3970 | -0.431 |
| Medium edit | 0.7094 | 0.3654 | -0.344 |
| Heavy edit | 0.5171 | 0.3455 | -0.172 |
| Added person | 0.8097 | 0.4073 | -0.402 |

True positives collapsed. Likely cause: at a 2.3:1 aspect ratio, padding shrinks the subject
to a small part of the 224x224 frame and ViT-B/32's 32-pixel patches cannot resolve it.
**Rejected.**

### 7.2 Multi-crop embedding (3 native-scale square windows along the long axis, max over crop pairs)

| Test image | Centre-crop | Multi-crop max | Change |
|---|---|---|---|
| Minimal edit | 0.8281 | 0.8246 | -0.004 |
| Medium edit | 0.7094 | 0.7321 | +0.023 |
| Heavy edit | 0.5171 | 0.5580 | +0.041 |
| Added person | 0.8097 | 0.8160 | +0.006 |

Neutral to slightly positive for true positives; does **not** separate the added-person case.
Costs about 3x embedding compute for non-square images. **Not adopted.**

### 7.3 More classical hashes (similarity to the original)

| Test image | pHash | dHash | wHash | aHash |
|---|---|---|---|---|
| Minimal edit | 0.625 | 0.609 | 0.562 | 0.609 |
| Medium edit | 0.562 | 0.469 | 0.406 | 0.391 |
| Heavy edit | 0.469 | 0.422 | 0.250 | 0.312 |
| Added person | 0.500 | 0.516 | **0.750** | **0.703** |

dHash tracks pHash (no new information). wHash and aHash score the added-person case **higher**
than pHash does, so blending them would worsen failure mode 2. **Rejected.**

### 7.4 Haar-cascade face count as a "content changed" signal
OpenCV frontal-face Haar cascade (OpenCV 4.14; the 5.0 wheel we first tried shipped without the
cascade API or its XML files) reported 4 faces
on the minimal-edit image (which has one child; the patterned carpet produced false positives)
and 1 face on the added-person image (which has two). **Rejected as unreliable.** Also, a
face-specific fix would not generalise to illustrations or non-portrait art.

### 7.5 Tile-grid pHash (4x4 grid, per-tile Hamming similarity)
Mean tile similarity was 0.51 / 0.50 / 0.53 / 0.50 for minimal / added-person / heavy / medium
(no separation), and border tiles were a constant 0.52 because both images had identical
grey padding. The two photos have different framing and zoom, so grid cells do not correspond.
**Uninformative without prior image registration** (keypoint matching + homography).

---

## 8. Known limitations and open problems

1. **Heavy AI edits are undetected.** Similarity matching has a ceiling; once structure and
   composition change enough, nothing links the copy to the original.
2. **Holistic scores conflate "same scene" with "same content"** (failure mode 2). Both pHash
   and CLIP-ViT-B/32 global embeddings behave this way on the case study.
3. **No localisation.** The system cannot say *which region* differs or whether content was
   added or removed.
4. **No AI-generation/editing detector.** No signal about whether an image is camera-original,
   AI-synthesised, or AI-edited, independent of any registered original.
5. **Evaluation is optimistic:** easy negatives, simulated (not generative) AI edits, 40 photos,
   a single real-world original.
6. **Threshold fragility:** the `likely` cut-off is within 0.0001 of the easiest real case.
7. **Duplicate-gate thresholds (0.95 / 0.90) are uncalibrated** and use raw scores, not the
   fused confidence.
8. **Centre-crop discards edge content** for non-square images; pHash is aspect-ratio-squashed.
   Neither is fixed (7.1 and 7.2).
9. **Scaling:** brute-force in-memory search; stores the full 512-float embedding per work in
   MongoDB and in the hash-chain record.
10. **Storage metadata:** stored originals keep EXIF/GPS.

---

## 9. Constraints any proposed solution must respect

- **CPU-only** (no GPU server), Windows development machine, a small student team.
- Open, downloadable pretrained models preferred; training from scratch is out of scope,
  light fine-tuning or a small trained head on top of frozen features may be acceptable.
- Added latency should stay in the low seconds per check; the registry may reach thousands of
  images.
- Must produce an **explainable** result usable as evidence in a takedown request, not only a
  score.
- Must keep false positives against real, legitimately different photographs low.

---

## 10. Earlier prototypes in the repository history (not part of the running backend)

Commit `e50bda0` (2026-09-23, since removed from the working tree, recoverable from git) held two
standalone command-line scripts:

- **`Perceptual_Hashing.py`**: prints eight hashes for one image: aHash, pHash, simple pHash,
  dHash, vertical dHash, wHash, **colour hash**, and **crop-resistant hash**. Exploratory; never
  evaluated or integrated. Colour hash and crop-resistant hash are the two **not** tested in
  Section 7.3.
- **`Vector_Pipeline.py`**: FAISS `IndexBinaryFlat` exact-Hamming search over 64-bit pHash,
  directory indexing plus top-k query. Classical-only; no embedding. The running backend
  replaced it with a NumPy index that also carries the embedding.

---

## 11. Reproducing the numbers

```bash
cd backend
python -m pytest -q                      # 29 tests
python -m eval.evaluate --download 40    # builds the 40-photo set, fingerprints, evaluates
python -m eval.evaluate --reuse          # recompute metrics from cached fingerprints
python -m eval.evaluate --edited DIR     # add real edited copies named <original-stem>__*.jpg
```
Results land in `backend/eval/results/<timestamp>/` (`summary.md`, `per_edit.csv`,
`summary.json`, charts). The run behind this report is `20261004-061543`.

Key files: `app/ingestion.py`, `app/fingerprint/{phash,embedding,combine}.py`,
`app/registry/{index,chain,anchor}.py`, `app/api/{register,check,public}.py`.
