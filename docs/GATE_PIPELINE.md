# Gate pipeline

The gate decides, for a suspected copy, whether it is *geometrically and photometrically derived* from
a registered work, and says how strongly it can claim that. It runs next to the classic fingerprint
scores (pHash + CLIP) and never replaces them.

Package: `backend/app/gate/`. Entry point: `run_gate(image_bytes, db, check_id=None, with_evidence=True)`
returning a `Verdict`. Settings: `app/gate/config.yaml` (hash + full snapshot stored in every verdict).

## Stages

| stage | module | what it does |
|---|---|---|
| G0 normalise | `normalize.py` | decode, bomb guard, EXIF orientation, RGB, trim flat borders. The same loader is used for suspects, registered works (feature time) and targets (dense time) |
| G1 retrieve | `retrieve.py` | embeds the query in 3 orientations (as-is, mirrored, flipped) in one batch; scores every work with CLIP and DINOv2 (whole image plus 5 crop vectors) and returns the union of the top-k of each |
| G2 verify | `verify.py` | SIFT + MAGSAC homography, as-is and mirrored. Guards: inliers must spread over the image, cover a real part of it (or one image must be contained in the other, for crops), and reproject tightly (repeated-pattern guard). Flat art with too few keypoints is retried by whole-image ECC alignment |
| G3 dense | `dense.py` | warp into the target's frame, ECC nudge, photometric normalisation (colour matrix + tone curve, saturated pixels excluded, luminance-only for grayscale), then residual, changed-pixel fraction, optical flow, edge/high-pass/noise correlation. **Measured on informative pixels only**: blank canvas matches trivially and says nothing |
| G4 classify | `classify.py` | pure function from metrics to a grade, honouring each component's mode |
| G5 evidence | `evidence.py` | aligned overlay, difference heatmap, changed-region mask, match lines, written under `<uploads>/evidence/<check_id>/` |
| origin | `origin.py` | C2PA manifest and IPTC `DigitalSourceType`; "no provenance metadata found" is never reported as "real". ML detector and watermark are stubs |

Candidates (G2-G4) are processed concurrently, sharing one set of query SIFT features.

## Grades and what may be claimed

| classification | grade | meaning | mode |
|---|---|---|---|
| `TIER1` | evidence | unchanged regions agree pixel for pixel (low residual, few changed pixels, flow and fine-detail correlation within limits) | active |
| `TIER2` | evidence | aligned, edge structure matches, pixels differ locally | **shadow** (reported as Related) |
| `RELATED_DIFFERENT_CAPTURE` | lead | credible geometry but fails Tier 1/2, or too little structure for pixel evidence. Likely a different photograph of the same scene. Human review required | active |
| `TIER3` | lead | strong embedding match without credible geometry | shadow |

A shadow tier never makes a candidate vanish: it falls through to the next active grade. Lead-grade
claims carry `human_review_required` and the UI words them as "lead, not proof".

## Where it is wired

- `POST /api/works/check/start` and `POST /api/works/register/start` run the same logic as background jobs; `GET /api/jobs/{id}?since=N` returns the stage events (`g0`..`g5`, with retrieval scores, normalised SIFT match coordinates and residual metrics) that the live pipeline view draws.
- A check searches **only the caller's own works** (`retrieve(owner_id=...)`, `index.search(user_id=...)`); registration still checks the whole registry for conflicts.
- `GET /api/discover` serves the sample-works feed; certificates gain a second page (fingerprint stack) built by `app/certificate/stack.py`.
- `POST /api/works/check`: returns `gate` (verdict + `evidence_urls`) and `gate_claim`; a gate failure leaves the classic result intact.
- `POST /api/works/register`: a Tier 1 hit against another creator's work returns 409 (nothing about that work is revealed); against your own it asks for confirmation; leads become `gate_notices`. New works get their DINOv2 vectors, crop vectors and SIFT cache in a background task.
- Frontend: Check, Evidence and Register pages.
- `GATE_ENABLED=false` in `.env` turns the whole gate off.

## Operations

```bash
python -m app.gate.backfill [--dry-run]     # DINOv2 + crop vectors + SIFT cache for works registered before the gate
python -m app.gate.run --original A.jpg --suspect B.jpg [--out DIR]    # one pair, no database
pytest                                       # offline, ~2 min
pytest -m models                             # uses the real CLIP/DINOv2 weights
```
Backfill and registration never modify registry (hash-chain) entries.

## Known limits (see also the evaluation results)

- Heavy AI regeneration is not linkable by any pixel method; it ends as *no claim*.
- Flat/vector art has few keypoints; resized and recompressed copies are found by the ECC fallback, but crops of flat art are not.
- A crop below ~3-5% of the original, or a thumbnail under ~200 px, has too few keypoints.
- Re-photographed screens/prints and non-rigid warps are not modelled by one homography.
- A **locked-off tripod frame of a static scene** is pixel-identical apart from sensor noise. Structure and fine detail match, so these pairs can look like copies; `noise_ncc` (noise correlation in flat tiles) is logged to measure whether it separates them, but is not yet used to grade.
- Rotated or flipped queries are retrieved only for the orientations embedded (as-is, mirrored, flipped): a 90 degree turn is verified by SIFT but may not be retrieved.
- All thresholds in `config.yaml` are uncalibrated starting values until `eval/gate_eval.py --sweep` has run on the dataset in `docs/DATASET_SPEC.md`.
