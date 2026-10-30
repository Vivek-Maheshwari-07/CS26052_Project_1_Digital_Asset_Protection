# Implementation plan: from working prototype to expert-ready (17 to 21 Oct, rehearse 22, present 23)

This file is self-contained. A new agent (for example in Antigravity) should be able to continue the work from here
without any chat history. Read sections 0 and 1 first, then pick up the first unchecked task in section 4.

---------------------------------------------------------------------------------------------------

## 0. Project snapshot (what exists today)

**Product.** Digital Asset Provenance: register an original image (fingerprints + SHA-256 hash chain + OpenTimestamps
anchor + PDF certificate), then check a suspected copy against **the caller's own works** and get a graded verdict with
visual evidence. React 19 + Vite front end, FastAPI + MongoDB back end, CPU-only laptop (about 7 GB RAM, Windows 11,
Python 3.13 venv at `backend/venv`).

**Pipeline (the "gate", `backend/app/gate/`).**

| stage | file | what it does |
|---|---|---|
| G0 normalise | `normalize.py` | EXIF, RGB, transparency on white, border trim |
| G1 retrieve | `retrieve.py` | CLIP + DINOv2, whole image + 5 crop vectors per work, 3 query orientations (as-is, mirrored, flipped), owner filter, union of top-k (`k_candidates: 3`) |
| G2 verify | `verify.py` | SIFT + MAGSAC homography, flip modes, spread / coverage / reprojection guards, ECC fallback for flat art |
| G3 dense | `dense.py` | warp, ECC refine, colour-matrix + tone-curve normalisation, residual, changed fraction, flow, high-pass and noise correlation |
| G4 classify | `classify.py` | Tier 1 (evidence, two routes), Tier 2 / Tier 3 (shadow), RELATED lead; falls through to lead |
| G5 evidence | `evidence.py` | overlay, difference heat-map, changed-region mask, match lines |
| origin | `origin.py` | C2PA / IPTC read (no injection) |

Config: `backend/app/gate/config.yaml` (v1.3.0). Docs: `docs/GATE_PIPELINE.md`, `docs/DATASET_SPEC.md`,
`docs/PIPELINE_STATUS_REPORT.md` (first-draft baseline), `docs/Digital_Asset_Provenance.pptx` (deck),
`docs/Digital_Asset_Provenance_Report.docx` (4-page report).

**Two newer features** (added by the user, not by the gate work):
- 3D digital twin at `/how-it-works` (`frontend/src/pages/DigitalTwin.jsx`, `components/DigitalTwin/`, data in
  `frontend/src/data/digitalTwinData.js`). A 92 s cinematic canvas film (`CinematicFilm.jsx`) sits above it.
- "Mark" voice copilot (`frontend/src/components/Mark/`, `backend/app/api/mark.py`, local Ollama `qwen2.5:1.5b`).
  Clear commands are answered by rules; only open questions call the model; model kept warm.

**Current headline numbers** (final run `backend/eval/results_gate/20261011_final`, 1,399 suspects, 713-work registry):

| measure | value |
|---|---|
| Tier 1 (pixel evidence) on altered copies | 86.9% (1,254 positives); scripted 86.5%, copies 92.3%, WhatsApp 97.6% |
| any claim (evidence or lead) | 95.6% |
| held-out 30% split (by original) | 85.6% (dev 86.9%) |
| false evidence on look-alikes / unrelated | 0 of 70 (95% upper bound 4.2%) |
| classic fused score, strict cut-off | 72.6% detected, fires on 70% of hard negatives |
| latency | median 4.3 s, p95 8.7 s (CPU) |
| weak spots | blur 25% Tier 1, crop_10 62%, AI light 72% evidence / medium 0% / heavy none |

## 1. Rules for any agent working here (do not skip)

1. **No git commands of any kind** (no status, add, commit, push) until the user says local work is complete and
   approves a push. The user has pushed earlier work themselves.
2. **Never print, copy or commit secrets.** `backend/.env` holds SMTP credentials. Do not read it aloud.
3. **Never overwrite the user's dataset images.** New outputs go to new folders. `dataset/_removed_oversize/` is
   quarantine, not trash.
4. **Do not `pip install opencv-python`.** It breaks the pinned headless build. If a package pulls it in:
   `pip install --force-reinstall --no-deps opencv-python-headless==4.14.0.94`.
5. **Downloads need the user's explicit yes** (state file, source, size). SSCD weights and Copydays are downloads.
6. **Do not run two model-heavy jobs at once** (RAM). Evaluation runs and uvicorn with warm-up compete.
7. **Windows + Git Bash quirks.** Heredocs with apostrophes break: write scripts with a file tool and run them.
   Use absolute paths for background jobs. Windows Python needs Windows paths, Git Bash needs `/c/...`.
8. **No new product features this week.** Everything below serves evidence and story. Supabase migration, discovery
   crawler and UI work are deferred (section 6).
9. **Report faithfully.** If a result is worse than hoped, report it and change the claim, not the data.
10. Keep code style consistent with the surrounding code. Offline tests: `cd backend && pytest` (about 2.5 min,
    114 pass, 4 deselected `-m models`).

**Useful commands**
```bash
cd /c/Users/Anisha/Desktop/Aayush/24CS051/DigitalAsset/backend
./venv/Scripts/python.exe -m pytest -q
./venv/Scripts/python.exe -m ruff check app eval tests --select F,E9
python -m eval.gate_eval --dataset ../dataset --validate
python -m eval.gate_eval --dataset ../dataset --out eval/results_gate/<run> --resume --reuse-registry --order priority --sweep
python -m eval.gate_eval --analyze-only eval/results_gate/<run> --dataset ../dataset
cd ../frontend && npx vite build --outDir "$TEMP/fe_check" --emptyOutDir
```
Run evaluations in the background with absolute paths and log to a file; they take about 15 suspects per minute.

## 2. What we want to be able to say on 23 Oct

**Positioning.** Not "the most accurate pipeline in the industry" (unprovable). Instead: *a dispute-grade verification
stage that turns a similarity hit into checkable evidence, with a measured accuracy-versus-latency frontier.* Platforms
run a fast first stage at feed scale; when a takedown or a licensing dispute needs defensible evidence, a slow
second stage runs. This matches how industry already works (retrieval then pairwise verification: Pinterest's
near-duplicate system, ISC21 winners).

**Research questions** (each needs a figure or table by 21 Oct):
1. How much does geometric + pixel verification cut false positives versus descriptor-only matching at the same recall?
2. Can grades be calibrated so "evidence" has a defined meaning (false-evidence bound)?
3. What does each stage cost in latency and buy in accuracy (the frontier)?
4. Where does it fail (blur, tiny crops, heavy AI regeneration, collages)?

**Claims we will make:** precision-first evidence; measured bounds; honest limits; cascade works; head-to-head versus
open-source industry baselines on our dataset (and Copydays if feasible).
**Claims we will not make:** "most accurate", authorship proof, detection of heavy AI regeneration, "100% private"
voice (browser speech recognition may use a cloud service), anything about competitors' accuracy (they do not publish it).

**Success criteria for Oct 21**
- [ ] Head-to-head table: pHash, PDQ, CLIP, DINOv2, SSCD (plain and with our 3-orientation TTA) versus the gate.
- [ ] Decision made and documented on SSCD as retrieval (adopt, hybrid, or report only).
- [ ] Frontier figure: latency versus recall at matched false-positive rate, one point per stage configuration.
- [ ] Tighter false-evidence bound (target: at least 350 negatives, 0 false, upper bound below 1%).
- [ ] All user-facing text (Mark, twin, landing, deck, report) consistent with the real pipeline.
- [ ] Wrong-work evidence cases (0.9% of scripted copies) investigated and explained.
- [ ] Deck (about 15 slides) + report updated; Q&A sheet; demo backup recording; code frozen; tests green.

## 3. Schedule at a glance

| day | date | focus | background compute |
|---|---|---|---|
| 1 | Fri 17 Oct | WS-A baselines harness and run; WS-G start (negatives code) | baselines run (about 30 min), then 350-negative gate run |
| 2 | Sat 18 Oct | WS-B SSCD retrieval behind a flag + priority-subset eval; WS-C frontier script | priority-subset run (about 35 min) |
| 3 | Sun 19 Oct | decide SSCD; full re-run if adopted; WS-D Copydays (optional); wrong-work analysis | full run (about 90 min) overnight |
| 4 | Mon 20 Oct | WS-E truthfulness pass; WS-F hardening; blind check if images supplied; regenerate numbers | blind run (about 10 min) |
| 5 | Tue 21 Oct | freeze; deck + report; Q&A; backup video; final tests | none |
| 6 | Wed 22 Oct | rehearse only, no code changes | none |

If anything slips, cut in this order: WS-D (Copydays), blind set, WS-F, then SSCD hybrid full re-run (keep baselines
and frontier). WS-A, WS-C, WS-E and WS-G are the must-haves.

## 4. Workstreams

### WS-A: Head-to-head baselines (must have; Day 1)

**Goal.** Show where the gate stands against the strongest open-source industry methods on the same data and metrics.

**A1. Factor out the registry list.** In `backend/eval/gate_eval.py`, `build_registry` builds the list of registry
works inline (originals not in `registry_exclude.txt`, plus distractors de-duplicated by SHA-256; 613 distinct
distractors of 978 files, registry 713). Extract that list-building into `registry_entries(root)` returning
`[(work_id, path, group)]`, keep behaviour identical, and have `build_registry` call it. Re-run
`pytest tests/gate -q` afterwards.

**A2. New script `backend/eval/baselines_eval.py`.** Arguments: `--dataset`, `--out` (default
`eval/results_baselines/<timestamp>`), `--methods` (default `phash,pdq,clip,dino,sscd`), `--tta {none,orient3}`,
`--split {dev,test}`, `--limit`. Reuse `gate_eval.load_manifest`, `load_label_fixes`, `apply_label_fixes`,
`registry_entries`, `cp_upper`, `tpr_at_fpr` so labels, aliases and the dev/test split are identical.

Descriptors (cache each as `.npy` under `<out>/_cache` so re-runs are instant):

| method | how | similarity |
|---|---|---|
| phash | `imagehash.phash(img, hash_size=8)` (already installed) | 1 - hamming / 64 |
| pdq | `pip install pdqhash` (verify package name; Meta's PDQ Python binding), 256-bit hash from RGB array | 1 - hamming / 256 |
| clip | `app.fingerprint.embedding.get_model` / `compute_embeddings` (OpenCLIP ViT-B/32) | cosine |
| dino | `app.gate.retrieve.embed_dino_batch` (whole image) | cosine |
| sscd | Meta SSCD TorchScript model (see below) | cosine |

SSCD: official repo `github.com/facebookresearch/sscd-copy-detection`. Use the `sscd_disc_mixup.torchscript.pt` model
(ResNet50, 512-d). **Ask the user before downloading; verify the URL in the repo README.** Preprocess: convert to RGB,
resize to 288 x 288 (squash), ImageNet mean/std, run the TorchScript module, L2-normalise.
Store weights under `backend/models/` (git-ignore it).

TTA `orient3`: score each query as the max over {as-is, horizontal flip, vertical flip}, the same freedom our gate's
retrieval has. Report both `none` (how the tool is normally used) and `orient3` (fair to our design).

**A3. Metrics.** Per method, with the registry as the gallery:
- Positives = suspects of relation `copy`, `classical`, `platform` (and, reported separately, `ai_light`, `ai_medium`).
  Negatives = `sibling`, `hard`, `unrelated`, **plus leave-one-out distractors**: each of the 613 registry
  distractors used as a query with itself removed from the gallery (cheap for baselines; gives about 680 negatives).
- Detection score of a suspect = its top-1 similarity over the gallery.
- Report: AUC; TPR at 1% and 0.1% FPR with Clopper-Pearson bounds (n negatives stated, FPR resolution 1/n);
  top-1 retrieval accuracy and recall@3 on positives; per-edit and per-category TPR at 1% FPR;
  **micro average precision (muAP)** as in ISC21: rank all queries by top-1 score, a hit counts only if the top-1
  reference is the true original, AP is area under that precision-recall curve over all ground-truth pairs.
- The gate enters as **operating points**, not a curve: from `eval/results_gate/20261011_final/runs.jsonl` take
  evidence claim on the true work (Tier 1/2) and any claim, with their FPR on the same 70 negatives (and on the
  350-negative gate run once available). Plot as markers on the ROC chart.

**A4. Outputs** in `--out`: `baselines_summary.md`, `per_suspect_scores.csv`, `per_edit.csv`, `roc.png`,
`meta.json` (versions, model hashes). Add a README line to `docs/GATE_PIPELINE.md` under Operations.

**A5. Acceptance.**
- One command regenerates everything; run time under about 40 min on CPU (about 2,100 images x 5 methods).
- CLIP and DINOv2 numbers are consistent with the gate's own retrieval stats (top-k retrieval of true work
  about 99.7%); if not, there is a loading or alias bug.
- Write a short `docs/BASELINES.md`: table, one paragraph of honest reading. **If SSCD beats the gate's retrieval on
  crops or recall at low FPR, say so in the table.** That is a finding, not a failure.

**Pitfalls.** Label aliases (`work_aliases.csv`) must be applied or distractor 0792 counts as a miss. Transparent PNGs
must go through `app.ingestion.to_rgb` (white background) for every method. Keep images RGB and identical across methods.

### WS-G1: Larger negative set for the gate (must have; start Day 1, runs in background)

**Goal.** Tighten "0 false evidence" (today 0 of 70, bound 4.2%).

- Add `exclude_ids: Optional[set]` to `retrieve(...)` in `backend/app/gate/retrieve.py` (mask scores exactly like
  the owner filter) and thread it through `run_gate` in `pipeline.py` (`exclude_work_ids=` argument, default None,
  no behaviour change when unset).
- Add `--negatives-from-distractors N` (default 0, use 350) to `gate_eval.py`: choose N distractors with a fixed seed,
  create in-memory suspects `{file: distractors/<f>, relation: "unrelated", edit: "distractor_loo", original_id: ""}`,
  and run them with `exclude_work_ids={own work id}`. Record them in `runs.jsonl` so the analysis counts them.
- Because retrieval excludes the self-match, candidates are genuine non-matches; any Tier 1/2 claim is a false evidence.
- Run in its own `--out` (e.g. `eval/results_gate/20261017_negs`) with `--reuse-registry` from the final run's
  `registry_cache.json` copied over. About 350 x 3 s, around 20 min.
- **Acceptance:** report n, false evidence, false leads and the 95% upper bound. If any false evidence appears, inspect
  it and report; do not tune it away without a held-out check.

### WS-B: SSCD as the retrieval stage (high value; Day 2 to 3)

**Why.** Retrieval uses generic CLIP + DINOv2. SSCD is trained for copy detection and is expected to retrieve crops,
overlays and screenshots better. Our verification stage can then work on better candidates. Outcome is either an
improvement to adopt or an honest comparison.

**B1. Config + loader.**
- `backend/app/gate/config.yaml`: add `retrieval: {backend: clip_dino, sscd_weights: "backend/models/sscd_disc_mixup.torchscript.pt", sscd_dim: 512}`;
  allowed backends `clip_dino` (current default), `sscd`, `hybrid` (union of top-k from clip, dino and sscd).
  Add the field to `backend/app/gate/settings.py` with validation; the config hash must change when it changes.
- New `backend/app/gate/sscd.py`: lazy singleton `get_sscd()` (TorchScript, CPU, `torch.inference_mode`),
  `embed_sscd_batch(images) -> np.ndarray` (L2-normalised). If weights are missing, backend `clip_dino` still works.

**B2. Features and index.**
- `backend/app/gate/features.py`: extend `compute_and_store` to compute and store `sscd` (whole) and `sscd_crops`
  (5 crops, same crop views as DINOv2: use `crop_views` from `retrieve.py`) when the backend needs them.
  Keep Mongo documents backward compatible (new optional fields).
- `backend/app/gate/retrieve.py`: extend `DualIndex` to hold the SSCD matrices; `score_index` returns per-model
  scores; `retrieve` merges top-k per backend. Embed the query in the same 3 orientations. Keep the owner filter.
- `backend/app/gate/backfill.py`: also backfill SSCD vectors (`--sscd` flag).

**B3. Tests (offline).** In `backend/tests/gate/`, add tests with a stub embedder (no weights needed): backend switch,
hybrid merge keeps the union and respects `k_candidates`, owner filter still applies, missing weights fall back.

**B4. Evaluate on the failing subset first.**
1. Build a file list of suspects that were not Tier 1 in the final run (about 165 in `failures.csv`) plus about 60 controls
   (random Tier 1 successes): save as `eval/lists/sscd_priority.txt`.
2. Run `python -m eval.gate_eval --dataset ../dataset --out eval/results_gate/20261018_sscd_prio --only-files eval/lists/sscd_priority.txt`
   with backend `sscd`, then again with `hybrid`. The registry must be rebuilt (new vectors): first run takes about
   25 min extra. Do not use `--reuse-registry` from the old run.
3. Compare per edit: retrieved-in-top-k, Tier 1, any claim, false evidence, median latency.

**B5. Decision rule (write the outcome into `docs/BASELINES.md`).**
- Adopt `hybrid` as default if: true-work retrieval does not drop, Tier 1 on the priority subset rises by at least
  3 points or crops/screens improve clearly, controls stay Tier 1, **false evidence stays 0**, and median latency
  rises by less than 0.7 s. Then run the full dataset (Day 3, background, about 90 min) to produce a new headline
  and update `frontend/src/data/results.json`, deck and report via the tools in WS-G.
- If not: keep `clip_dino`, keep the code behind the flag, and report SSCD as a baseline and as a negative
  result for retrieval ("verification, not retrieval, is the contribution").

### WS-C: Accuracy versus latency frontier (must have; Day 2)

**Goal.** The headline figure for the "cost of certainty" framing.

- New `backend/eval/frontier.py` reading `eval/results_gate/<run>/runs.jsonl` (print one record first to see the
  schema: per-candidate metrics, stage timings `g0..g5`, classic scores `phash_score`, `embedding_score`,
  `confidence`, and the gate verdict). Configurations, cheapest first:
  1. **pHash only**: score = pHash similarity of the best candidate.
  2. **CLIP only**: embedding score.
  3. **Classic fused** (production first-draft): `confidence`.
  4. **Retrieval + geometry (G0-G2)**: a work is claimed if the true candidate has credible geometry.
  5. **Full gate (G0-G4)**: Tier 1 (evidence) and, separately, Tier 1/2.
- For 1 to 3, pick the threshold giving 1% FPR on the negatives (same negatives as WS-A), then read recall on positives.
  For 4 and 5, FPR is measured at the gate's natural decision on the same negatives.
- Latency for each configuration = cumulative median of the stage timings it needs (plus the embedding time for
  1 to 3, measured once on 200 images).
- Outputs: `eval/results_frontier/frontier.md`, `frontier.csv`, `frontier.png` (x = median seconds on log axis,
  y = recall at matched FPR; one marker per configuration; annotate p95). Also a small table of the marginal gain
  per stage.
- **Acceptance:** numbers are reproducible from the stored run; chart readable on a slide; text states the
  hardware (CPU laptop) and that the first three points are first-draft components, not Meta's or Pinterest's systems.

### WS-D: Public benchmark (optional; Day 3, only if download is small)

- **Ask the user before downloading.** Copydays (INRIA, `lear.inrialpes.fr/~jegou/data.php#copydays`): originals
  (157), and the "strong" subset (printing / scanning, severe crops, painting). State sizes and ask.
- Registry = Copydays originals + our 613 distractors as distractors. Queries = strong subset. Metric = mAP as in the
  Copydays protocol; compare SSCD, CLIP, DINOv2, our gate retrieval and the gate verdict (claimed correct work).
- Write results to `docs/BASELINES.md` with a clear note that it is a subset and not the full DISC21 protocol.
- If skipped, state in the deck: "public benchmarks (DISC21, Copydays) are the next evaluation step".

### WS-E: Truthfulness and consistency pass (must have; Day 4, start the audit on Day 1)

**Goal.** Nothing user-facing contradicts the real pipeline or the report.

Audit and fix (grep for each term; keep a checklist in `docs/CLAIMS_AUDIT.md` with: statement, where, evidence, fixed?):
- `backend/app/api/mark.py`: `SYSTEM_PROMPT` and rule replies. Replace "Tier 1 = pHash+CLIP screening, Tier 2 = geometry"
  with the real grades: Tier 1 = pixel-level evidence; related image = lead for human review. Remove "4000 iterations /
  3.0 px" unless they match `config.yaml`; remove "C2PA injection" (we read C2PA and IPTC, we do not write it).
- `frontend/src/data/digitalTwinData.js` and `TechModal.jsx`: remove or relabel the fused-score formula
  (it belongs to the classic retrieval score only); replace "DINOv2 patch-token heatmap localises inpainting" with
  "aligned-pixel difference highlights changed regions"; delete any competitor numbers or accuracy claims that are not
  sourced; make scenario B/C/D match the actual flow (retrieve, verify, compare, grade).
- `frontend/src/components/Mark/MarkOrb.jsx` and docs: "runs 100% locally, total privacy" is false for voice because
  the browser's speech recognition may send audio to a cloud service. Reword: "language model runs locally; browser
  speech recognition may use your browser vendor's service." Remove unmeasured numbers ("98% JSON compliance",
  "65 to 75 tokens/s") unless benchmarked (`ollama run` timing); there is a short benchmark script task below.
- `frontend/src/pages/Landing.jsx`: every number comes from `frontend/src/data/results.json`; re-check after any new run.
- README / docs: update `docs/GATE_PIPELINE.md` and add a short "Limits" section to the landing page copy.

**Mark latency benchmark (30 min, optional).** Once Ollama is healthy (`ollama list`): time 20 open-ended prompts
cold and warm; time 20 rule commands; record p50/p95 in `docs/MARK.md`. Confirm with `ollama ps` that the model is on the GPU.

**Wrong-work evidence cases (about 11 of 1,200 scripted copies).** Write `eval/analyze_wrong_work.py`: from the final
run list every record where an evidence claim names a work other than the true original; print file, claimed work,
metrics, whether the claimed work is a visually similar distractor or an alias, and save evidence images with
`--evidence`. Classify each as (a) label/alias issue, (b) near-duplicate in registry, (c) real error. Document in
`docs/BASELINES.md`. Fix only (a); report (b) and (c).

**Blind check (only if the user supplies images).** 20 new originals not seen before, 6 edits each (crop 30%, blur,
JPEG q30, resize 50%, screenshot frame, hflip) made with `eval/make_classical_set.py` into a new folder
`dataset_blind/`. Freeze config, run once, report as "blind". Do not change thresholds afterwards.

### WS-F: Small hardening items (Day 4, only what fits in half a day)

- **Server-side duplicate registration guard.** In `backend/app/api/register.py::register_core`, serialise per user:
  an `asyncio.Lock` keyed by user id around the duplicate check + insert, and re-check by file SHA-256 per user after
  acquiring the lock. Add a test that fires two concurrent registrations of the same image and expects one success and one
  409/own-duplicate response.
- **Rate limits on auth and expensive endpoints.** A simple in-memory limiter (per IP and per user) for `/api/auth/*`,
  `/api/works/*/start`. Tests for the 429 path.
- **`.gitignore` additions** (do not run git): `dataset/`, `backend/eval/results_*/`, `backend/eval/data/`, `backend/venv/`,
  `backend/uploads/`, `backend/models/`, `frontend/node_modules/`, `*.pptx` builds if desired.
- Re-run `pytest`, ruff, `vite build`.

### WS-G: Numbers, deck, report, rehearsal material (must have; Days 4 and 5)

**Tooling (copy the builders into the repo so they are not lost): `docs/tools/`** holds `build_deck.js`,
`collect_numbers.py`, `qa_deck.py`, `build_report.js` (copied from the session scratchpad).
Install once in that folder: `npm install pptxgenjs docx`. They read `deck_data*.json` produced by
`collect_numbers.py <run_dir> <out.json>`.

1. **Refresh numbers.** After the last full run: `python docs/tools/collect_numbers.py eval/results_gate/<run> docs/tools/deck_data_final.json`,
   copy to `frontend/src/data/results.json` (keep keys), rebuild the front end.
2. **Deck (about 15 slides for a 20-minute slot).** Order:
   1. Problem and who has it. 2. Positioning: dispute-grade verification stage, cascade diagram. 3. Landscape in one table
   (platform tools, reverse search, watermarking, provenance metadata, AI detection; note that vendors do not publish
   accuracy). 4. Our first draft and what broke. 5. The gate in 6 stages. 6. Evaluation protocol (dataset, split, bounds).
   7. Head-to-head baselines (WS-A). 8. Accuracy versus latency frontier (WS-C). 9. SSCD experiment outcome (WS-B).
   10. Evidence examples (overlay, heat-map, residual) and the AI-edit localisation example. 11. Honest limits.
   12. Provenance layer (hash chain, OpenTimestamps, C2PA read). 13. Roadmap. 14. Questions for the experts. 15. Backup
   slides: per-edit table, thresholds, failures. Keep the existing 30-slide deck as an appendix file.
3. **Report.** Regenerate `docs/Digital_Asset_Provenance_Report.docx` (keep 5 pages max) adding the head-to-head and
   frontier tables, the SSCD outcome, the larger negative bound, and an updated boast audit.
4. **Q&A sheet** `docs/QA_PREP.md`: one honest paragraph each for: why not just SSCD, why only your own works, what about
   adversarial attacks on hashes, how would this scale, legal weight of a timestamp, why not watermarking, what about AI
   edits, why is it slow, what would you do with a month more, how were thresholds chosen (dev/test split, sweep).
5. **Demo plan.** Primary: live app with a pre-registered work and a prepared cropped copy (two files in
   `docs/demo_assets/`). Backup: the 92 s film at `/how-it-works` and a screen recording of a full register + check
   run saved outside the repo. Rehearse twice with a timer; keep the app on a warm backend (`WARMUP_MODELS` on).

## 5. Daily checklist

**Day 1 (Fri 17 Oct)**
- [ ] A1 refactor + tests green
- [ ] Ask user: SSCD weights download (source, filename, size)
- [ ] A2/A3 harness; run baselines (all methods, both TTA modes)
- [ ] G1 code (`exclude_ids`, `--negatives-from-distractors`), launch the 350-negative gate run in the background
- [ ] Start `docs/CLAIMS_AUDIT.md` (grep only, no edits yet)

**Day 2 (Sat 18 Oct)**
- [ ] Read baselines results, write the first version of `docs/BASELINES.md`
- [ ] B1 to B3 SSCD behind a flag, offline tests green
- [ ] Build the priority list; launch the priority-subset run (SSCD, then hybrid)
- [ ] WS-C frontier script and first figure

**Day 3 (Sun 19 Oct)**
- [ ] B5 decision; if adopted launch the full run overnight (no other heavy jobs)
- [ ] Wrong-work analysis
- [ ] WS-D Copydays only if the user approved the download and time allows
- [ ] Append results to `docs/BASELINES.md`

**Day 4 (Mon 20 Oct)**
- [ ] WS-E fixes (Mark, twin text, privacy wording), Mark benchmark if Ollama is healthy
- [ ] WS-F hardening
- [ ] Blind check if images arrive
- [ ] Final numbers: collect, results.json, rebuild, full `pytest` + ruff + vite build

**Day 5 (Tue 21 Oct)**
- [ ] Deck, report, Q&A sheet, demo assets, backup recording
- [ ] Freeze: no code or threshold changes after this point
- [ ] User review of the deck; fix wording only

**Day 6 (Wed 22 Oct)** rehearse twice; sleep.

## 6. Deferred work (explain as roadmap, do not start before 23 Oct)

1. **Postgres + Supabase migration** (about 3 weeks). Summary: Postgres for users, works, checks, chain entries, jobs;
   `pgvector` for embeddings (exact owner-scoped scan for checks because each user has few works; HNSW only for the
   global duplicate check; `halfvec` to halve storage; about 7 vectors per work); Supabase Auth replaces the custom OTP
   (needs a custom SMTP sender; verify the Supabase JWT in FastAPI via JWKS; row-level security as a second layer);
   images, evidence images and SIFT caches in private storage with signed URLs; chain append under a row lock with a
   unique `prev_hash`, batch Merkle roots anchored hourly; jobs table + worker queue + realtime progress instead of in-memory
   jobs. Phases: 0 decisions, 1 schema, 2 auth, 3 vector port gated by `gate_eval` parity (retrieval within 0.3 points,
   no new false evidence, DB time under 50 ms), 4 storage, 5 jobs, 6 cutover, 7 deploy + CI + monitoring + load test.
2. **Discovery** (find copies on the web): integrate an existing reverse-search index first; crawler later.
3. **Better local matching** (learned matchers) for blur and flat art, only with an ablation.
4. **Noise-pattern check** to grade near-identical captures; calibrate shadow Tier 2/3.
5. **Active indexing at registration** (Meta's "active image indexing" idea): perturb at registration so later retrieval
   improves. Genuine research direction because registration is under our control.
6. **Stronger AI-edit coverage:** more editors (Firefly, SD inpaint, newer MMDiT editors), public benchmark COCO-Inpaint,
   optional trained localiser as a separate evidence source.
7. **Legal and trust:** identity verification, dispute flow, legal review of what a timestamp proves.

## 7. Competitor and prior-art summary (from research on 17 Oct; the user is researching further)

Almost nothing publishes accuracy. Do not cite numbers for competitors that you cannot source.
- **Meta:** open-source PDQ/TMK hashes; SSCD descriptor (CVPR 2022); ISC21/DISC21 benchmark; Rights Manager for images.
  France's regulator Arcom evaluated Rights Manager (limited, inconsistent across Facebook and Instagram) and could not
  evaluate Pinterest's Claim Portal; no accuracy was published by either.
- **Pinterest:** near-duplicate system over 8 billion images in three stages (candidate generation, candidate selection,
  clustering); 53k human-labelled pairs released.
- **Reverse search / monitoring:** TinEye (fingerprint index, strong on exact and near-exact copies), Google Lens, Pixsy
  (monitoring and enforcement service). No published accuracy.
- **Watermarking:** Digimarc, Imatag, Steg.AI, Google SynthID (claims robustness; self-reported). Needs embedding before
  release; can be attacked.
- **Provenance metadata:** C2PA / Content Credentials (Adobe, Truepic, camera makers), Numbers Protocol (C2PA + blockchain).
  Metadata is stripped by common edits; only covers content signed at creation.
- **AI-edit / manipulation detection:** Hive, Reality Defender, Sightengine (vendor claims, not reviewed in depth);
  research benchmarks such as COCO-Inpaint show large drops on inpainted images.
- **Benchmarks:** DISC21/ISC21 (muAP, 1M reference images), Copydays, AnyPattern, Pinterest's labelled pairs.
- **To read:** SSCD paper (arXiv 2202.10261), ISC21 results (arXiv 2202.04007), DISC21 (arXiv 2106.09672), Pinterest
  near-duplicate paper (arXiv 2209.08433), PDQ/TMK test drive (arXiv 1912.07745), hash attacks (arXiv 2106.09820),
  Active Image Indexing (arXiv 2210.10620), "Tracing Copied Pixels" (ICCV 2025), COCO-Inpaint (arXiv 2504.18361).
- **Our differentiators** (claim only what the numbers support): graded evidence that a person can check; where an image
  was changed (aligned-pixel difference); private owner-scoped check bundled with registration and timestamp;
  published limits and bounds.

## 8. Risk register

| risk | likelihood | mitigation |
|---|---|---|
| SSCD beats our retrieval and the gate adds little | medium | still a valid story: cascade (SSCD retrieval + our verification); report honestly |
| SSCD weights or PDQ package unavailable | low | ask the user; fall back to DINOv2 + pHash baselines and state SSCD as next step |
| CPU contention slows runs | high | one heavy job at a time; use `--only-files` subsets; overnight full runs |
| Full re-run does not finish by Day 4 | medium | keep the old final run as the headline; present the new one as a labelled experiment |
| New false evidence appears in the 350-negative run | low-medium | inspect, report honestly, show the bound; do not tune on the negatives you report |
| Demo fails live | medium | pre-registered work, warm backend, backup film and recording |
| Time overrun | high | cut order in section 3; never cut WS-A, C, E, G |

## 9. Starter prompt for the next agent (paste into Antigravity)

> You are continuing the Digital Asset Provenance project in `C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset`.
> Read `docs/IMPLEMENTATION_PLAN_OCT21.md` fully, then `docs/GATE_PIPELINE.md` and `backend/eval/gate_eval.py`.
> Follow the rules in section 1 (no git, no secrets, no dataset overwrites, ask before downloads, one heavy job at a time).
> Find the first unchecked item in section 5, implement it with offline tests, run `pytest` and ruff, and report results
> faithfully, including negative results. Update the checkboxes in section 5 as you go.
