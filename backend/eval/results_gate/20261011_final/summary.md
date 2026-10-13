# Gate evaluation (2026-10-11T18:49:13)

1399 suspects (0 errored) against a registry of 713 works. Gate config `59d26cfa7b1c`, pipeline 1.3.0.

## Alterations that must be caught (copy / classical / platform)

| relation | n | retrieved (in top-k) | Tier 1 (natural) | Tier 1/2 (natural) | any claim reported | evidence claim reported | evidence on WRONG work |
|---|---|---|---|---|---|---|---|
| classical | 1200 | 99.7% | 86.5% | 95.2% | 95.4% | 86.4% | 0.9% |
| copy | 13 | 100.0% | 92.3% | 100.0% | 100.0% | 92.3% | 0.0% |
| platform | 41 | 100.0% | 97.6% | 100.0% | 100.0% | 97.6% | 0.0% |

### Per edit (worst first)

| edit | n | retrieved | Tier 1 | any claim | main reasons for not Tier 1 |
|---|---|---|---|---|---|
| blur_gaussian | 100 | 100.0% | 25.0% | 98.0% | graded_TIER2 x73; not_credible:not_enough_matches x2 |
| crop_10 | 100 | 97.0% | 62.0% | 65.0% | not_credible:not_enough_matches x22; not_credible:insufficient_coverage x8 |
| jpeg_q10 | 100 | 100.0% | 87.0% | 100.0% | graded_TIER2 x13 |
| crop_30 | 100 | 100.0% | 90.0% | 91.0% | not_credible:not_enough_matches x4; not_credible:insufficient_coverage x3 |
| rotate_180 | 100 | 100.0% | 90.0% | 100.0% | graded_TIER2 x10 |
| screenshot_frame | 100 | 100.0% | 95.0% | 96.0% | not_credible:insufficient_coverage x3; not_credible:not_enough_matches x1 |
| rotate_90 | 100 | 99.0% | 95.0% | 99.0% | graded_TIER2 x4; not_retrieved x1 |
| crop_50 | 100 | 100.0% | 96.0% | 97.0% | not_credible:insufficient_coverage x2; not_credible:not_enough_inliers x1 |
| whatsapp_roundtrip | 41 | 100.0% | 97.6% | 100.0% | graded_TIER2 x1 |
| resize_50 | 100 | 100.0% | 98.0% | 99.0% | not_credible:not_enough_inliers x1; graded_RELATED_DIFFERENT_CAPTURE x1 |
| jpeg_q30 | 100 | 100.0% | 100.0% | 100.0% |  |
| grayscale | 100 | 100.0% | 100.0% | 100.0% |  |
| hflip | 100 | 100.0% | 100.0% | 100.0% |  |
| byte_identical_reupload | 12 | 100.0% | 100.0% | 100.0% |  |

### Per platform (worst first)

| platform | n | retrieved | Tier 1 | any claim | main reasons for not Tier 1 |
|---|---|---|---|---|---|
| whatsapp | 49 | 100.0% | 98.0% | 100.0% | graded_TIER2 x1 |

### Per image category (worst first)

| category | n | retrieved | Tier 1 | any claim | main reasons for not Tier 1 |
|---|---|---|---|---|---|
| unrelated | 1 | 100.0% | 0.0% | 100.0% | graded_TIER2 x1 |
| photo_pattern | 13 | 100.0% | 38.5% | 92.3% | graded_TIER2 x7; not_credible:not_enough_matches x1 |
| perfume | 12 | 100.0% | 75.0% | 91.7% | graded_TIER2 x2; not_credible:not_enough_matches x1 |
| book | 12 | 100.0% | 75.0% | 100.0% | graded_TIER2 x3 |
| photo_lowlight | 12 | 100.0% | 75.0% | 91.7% | graded_TIER2 x2; not_credible:not_enough_matches x1 |
| whitebackground | 63 | 100.0% | 76.2% | 84.1% | not_credible:not_enough_matches x6; graded_TIER2 x5 |
| alphatransparent | 187 | 97.9% | 78.1% | 92.5% | graded_TIER2 x26; not_credible:not_enough_matches x6 |
| illustration | 188 | 100.0% | 79.8% | 89.4% | graded_TIER2 x17; not_credible:not_enough_matches x9 |
| photo_document | 51 | 100.0% | 86.3% | 98.0% | graded_TIER2 x5; graded_RELATED_DIFFERENT_CAPTURE x1 |
| logo | 63 | 100.0% | 87.3% | 93.7% | graded_TIER2 x4; not_credible:not_enough_matches x3 |
| photo_night | 52 | 100.0% | 90.4% | 98.1% | graded_TIER2 x4; not_credible:not_enough_matches x1 |
| ball | 12 | 100.0% | 91.7% | 100.0% | graded_TIER2 x1 |
| steel | 12 | 100.0% | 91.7% | 100.0% | graded_TIER2 x1 |
| photo_architecture | 25 | 100.0% | 92.0% | 100.0% | graded_TIER2 x2 |
| photo_portrait | 38 | 100.0% | 92.1% | 100.0% | graded_TIER2 x3 |
| photo_studio | 13 | 100.0% | 92.3% | 100.0% | graded_TIER2 x1 |
| heavyart | 462 | 100.0% | 95.0% | 99.6% | graded_TIER2 x21; not_credible:insufficient_coverage x1 |
| photo_landscape | 25 | 100.0% | 96.0% | 100.0% | graded_TIER2 x1 |
| photopastaportrait | 13 | 100.0% | 100.0% | 100.0% |  |

### Why positives were not Tier 1

| reason | count |
|---|---|
| graded_TIER2 | 106 |
| not_credible:not_enough_matches | 29 |
| not_credible:insufficient_coverage | 16 |
| not_retrieved | 4 |
| not_credible:not_enough_inliers | 3 |
| not_credible:inconsistent_matches | 2 |
| graded_RELATED_DIFFERENT_CAPTURE | 2 |
| not_credible:insufficient_spread | 1 |
| low_information | 1 |

## AI-edited copies

| relation | n | retrieved | evidence claim | lead claim | no claim |
|---|---|---|---|---|---|
| ai_heavy | 25 | 44.0% | 0.0% | 0.0% | 100.0% |
| ai_light | 25 | 100.0% | 72.0% | 28.0% | 0.0% |
| ai_medium | 25 | 88.0% | 0.0% | 40.0% | 60.0% |

Heavy regeneration is expected to end as *no claim* (an information limit); a hit there is a bonus.

## What must NOT be claimed as evidence (false-evidence rate, 95% upper bound)

| relation | n | false evidence claims | upper bound | natural Tier1/2 on any candidate | lead claims |
|---|---|---|---|---|---|
| sibling | 20 | 0 (0.0%) | <= 13.9% | 5 | 9 (45.0%) |
| unrelated | 50 | 0 (0.0%) | <= 5.8% | 0 | 0 (0.0%) |
| **all negatives** | 70 | 0 (0.0%) | <= 4.2% |  |  |

A *lead* on a sibling / same-template pair is acceptable (it asks a human to look); a lead on an `unrelated` image is a false lead.

## Gate vs classic fingerprint scores

Positives = copy/classical/platform + ai_light/ai_medium (1303); negatives = siblings, templates, hard and unrelated (70). TPR at a fixed false-positive rate on those negatives:

| score | TPR @ 1% FPR | TPR @ 0.1% FPR | n negatives |
|---|---|---|---|
| pHash | 44.3% | 44.3% | 70 |
| CLIP embedding | 34.1% | 29.5% | 70 |
| fused confidence | 36.1% | 29.5% | 70 |

Operating points as deployed (positives = copy/classical/platform):

| system | detects positives | fires on hard negatives | fires on unrelated |
|---|---|---|---|
| classic fused >= likely (0.996) | 72.6% | 70.0% | 0.0% |
| classic fused >= possible (0.27) | 95.1% | 100.0% | 46.0% |
| gate: evidence claim (Tier 1/2) on the right work | 86.8% | 0.0% | 0.0% |
| gate: any claim (evidence or lead) on the right work | 95.6% | 45.0% | 0.0% |

## Latency (seconds, CPU)

| stage | p50 | p95 | max |
|---|---|---|---|
| g0_normalize | 0.15 | 0.68 | 2.73 |
| g1_retrieve | 1.25 | 2.77 | 9.42 |
| g2_verify | 3.80 | 10.66 | 24.24 |
| g3_dense | 1.79 | 4.19 | 9.40 |
| g4_classify | 0.00 | 0.00 | 0.00 |
| candidates_wall | 2.63 | 5.70 | 12.07 |
| g5_evidence | 0.00 | 0.00 | 0.18 |
| total | 4.30 | 8.68 | 23.81 |

Candidates verified per check: median 4, max 6. g2-g4 are sums over candidates; `candidates_wall` is the elapsed time (they run concurrently).

Per-candidate metrics: `per_candidate.csv`. Every false-evidence case, false lead and missed positive: `failures.csv`.
