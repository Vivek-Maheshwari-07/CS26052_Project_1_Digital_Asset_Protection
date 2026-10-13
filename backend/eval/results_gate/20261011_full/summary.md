# Gate evaluation (2026-10-11T15:26:18)

786 suspects (2 errored) against a registry of 713 works. Gate config `c06daf440351`, pipeline 1.2.0.

## Alterations that must be caught (copy / classical / platform)

| relation | n | retrieved (in top-k) | Tier 1 (natural) | Tier 1/2 (natural) | any claim reported | evidence claim reported | evidence on WRONG work |
|---|---|---|---|---|---|---|---|
| classical | 585 | 100.0% | 78.6% | 92.6% | 93.0% | 78.6% | 1.4% |
| copy | 12 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% |
| platform | 41 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% |

### Per edit (worst first)

| edit | n | retrieved | Tier 1 | any claim | main reasons for not Tier 1 |
|---|---|---|---|---|---|
| blur_gaussian | 49 | 100.0% | 16.3% | 100.0% | graded_TIER2 x41 |
| crop_10 | 55 | 100.0% | 43.6% | 47.3% | not_credible:not_enough_matches x17; not_credible:insufficient_coverage x11 |
| rotate_180 | 56 | 100.0% | 75.0% | 100.0% | graded_TIER2 x14 |
| crop_30 | 47 | 100.0% | 83.0% | 85.1% | not_credible:insufficient_coverage x3; not_credible:inconsistent_matches x2 |
| resize_50 | 42 | 100.0% | 83.3% | 100.0% | graded_TIER2 x6; graded_RELATED_DIFFERENT_CAPTURE x1 |
| screenshot_frame | 48 | 100.0% | 83.3% | 93.8% | graded_TIER2 x5; not_credible:insufficient_coverage x2 |
| jpeg_q10 | 43 | 100.0% | 83.7% | 100.0% | graded_TIER2 x7 |
| rotate_90 | 45 | 100.0% | 88.9% | 100.0% | graded_TIER2 x5 |
| crop_50 | 46 | 100.0% | 93.5% | 95.7% | not_credible:insufficient_coverage x1; graded_TIER2 x1 |
| jpeg_q30 | 59 | 100.0% | 98.3% | 100.0% | graded_TIER2 x1 |
| byte_identical_reupload | 12 | 100.0% | 100.0% | 100.0% |  |
| whatsapp_roundtrip | 41 | 100.0% | 100.0% | 100.0% |  |
| grayscale | 45 | 100.0% | 100.0% | 100.0% |  |
| hflip | 50 | 100.0% | 100.0% | 100.0% |  |

### Per platform (worst first)

| platform | n | retrieved | Tier 1 | any claim | main reasons for not Tier 1 |
|---|---|---|---|---|---|
| whatsapp | 49 | 100.0% | 100.0% | 100.0% |  |

### Per image category (worst first)

| category | n | retrieved | Tier 1 | any claim | main reasons for not Tier 1 |
|---|---|---|---|---|---|
| book | 2 | 100.0% | 50.0% | 100.0% | graded_TIER2 x1 |
| photo_pattern | 10 | 100.0% | 60.0% | 90.0% | graded_TIER2 x3; not_credible:not_enough_matches x1 |
| photo_architecture | 10 | 100.0% | 60.0% | 90.0% | graded_TIER2 x3; not_credible:insufficient_coverage x1 |
| illustration | 188 | 100.0% | 66.0% | 89.4% | graded_TIER2 x43; not_credible:not_enough_matches x9 |
| alphatransparent | 60 | 100.0% | 78.3% | 88.3% | graded_TIER2 x6; not_credible:not_enough_matches x4 |
| logo | 61 | 100.0% | 80.3% | 91.8% | graded_TIER2 x7; not_credible:not_enough_matches x3 |
| whitebackground | 28 | 100.0% | 82.1% | 89.3% | graded_TIER2 x2; not_credible:not_enough_matches x2 |
| photo_night | 23 | 100.0% | 82.6% | 95.7% | graded_TIER2 x3; not_credible:not_enough_matches x1 |
| photo_document | 29 | 100.0% | 82.8% | 100.0% | graded_TIER2 x4; graded_RELATED_DIFFERENT_CAPTURE x1 |
| steel | 6 | 100.0% | 83.3% | 100.0% | graded_TIER2 x1 |
| photo_portrait | 14 | 100.0% | 92.9% | 100.0% | graded_TIER2 x1 |
| heavyart | 170 | 100.0% | 93.5% | 98.2% | graded_TIER2 x8; not_credible:insufficient_coverage x3 |
| photopastaportrait | 4 | 100.0% | 100.0% | 100.0% |  |
| photo_studio | 5 | 100.0% | 100.0% | 100.0% |  |
| photo_landscape | 12 | 100.0% | 100.0% | 100.0% |  |
| ball | 7 | 100.0% | 100.0% | 100.0% |  |
| photo_lowlight | 5 | 100.0% | 100.0% | 100.0% |  |
| perfume | 4 | 100.0% | 100.0% | 100.0% |  |

### Why positives were not Tier 1

| reason | count |
|---|---|
| graded_TIER2 | 82 |
| not_credible:not_enough_matches | 20 |
| not_credible:insufficient_coverage | 17 |
| not_credible:inconsistent_matches | 2 |
| graded_RELATED_DIFFERENT_CAPTURE | 2 |
| not_credible:insufficient_spread | 1 |
| not_credible:not_enough_inliers | 1 |

## AI-edited copies

| relation | n | retrieved | evidence claim | lead claim | no claim |
|---|---|---|---|---|---|
| ai_heavy | 25 | 44.0% | 0.0% | 0.0% | 100.0% |
| ai_light | 25 | 100.0% | 60.0% | 40.0% | 0.0% |
| ai_medium | 25 | 92.0% | 0.0% | 40.0% | 60.0% |

Heavy regeneration is expected to end as *no claim* (an information limit); a hit there is a bonus.

## What must NOT be claimed as evidence (false-evidence rate, 95% upper bound)

| relation | n | false evidence claims | upper bound | natural Tier1/2 on any candidate | lead claims |
|---|---|---|---|---|---|
| sibling | 20 | 1 (5.0%) | <= 21.6% | 5 | 8 (40.0%) |
| unrelated | 51 | 1 (2.0%) | <= 9.0% | 1 | 0 (0.0%) |
| **all negatives** | 71 | 2 (2.8%) | <= 8.6% |  |  |

A *lead* on a sibling / same-template pair is acceptable (it asks a human to look); a lead on an `unrelated` image is a false lead.

## Gate vs classic fingerprint scores

Positives = copy/classical/platform + ai_light/ai_medium (688); negatives = siblings, templates, hard and unrelated (71). TPR at a fixed false-positive rate on those negatives:

| score | TPR @ 1% FPR | TPR @ 0.1% FPR | n negatives |
|---|---|---|---|
| pHash | 45.5% | 45.5% | 71 |
| CLIP embedding | 36.9% | 32.4% | 71 |
| fused confidence | 39.8% | 32.6% | 71 |

Operating points as deployed (positives = copy/classical/platform):

| system | detects positives | fires on hard negatives | fires on unrelated |
|---|---|---|---|
| classic fused >= likely (0.996) | 71.8% | 70.0% | 2.0% |
| classic fused >= possible (0.27) | 93.9% | 100.0% | 47.1% |
| gate: evidence claim (Tier 1/2) on the right work | 80.4% | 5.0% | 2.0% |
| gate: any claim (evidence or lead) on the right work | 93.6% | 45.0% | 2.0% |

## Latency (seconds, CPU)

| stage | p50 | p95 | max |
|---|---|---|---|
| g0_normalize | 0.12 | 0.75 | 2.88 |
| g1_retrieve | 1.14 | 2.61 | 12.22 |
| g2_verify | 4.71 | 15.20 | 30.68 |
| g3_dense | 1.63 | 4.39 | 9.51 |
| g4_classify | 0.00 | 0.00 | 0.03 |
| candidates_wall | 2.61 | 6.31 | 11.52 |
| g5_evidence | 0.00 | 0.00 | 0.20 |
| total | 4.21 | 8.98 | 26.61 |

Candidates verified per check: median 8, max 10. g2-g4 are sums over candidates; `candidates_wall` is the elapsed time (they run concurrently).

## Problems during the run

2 suspects errored, e.g. hard_negatives/orig_089__sibling__train_burst5.jpg: InvalidImageError: Image is too large to process.; hard_negatives/orig_089__sibling__train_burst6.jpg: InvalidImageError: Image is too large to process.

Per-candidate metrics: `per_candidate.csv`. Every false-evidence case, false lead and missed positive: `failures.csv`.
