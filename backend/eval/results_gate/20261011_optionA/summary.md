# Gate evaluation (2026-10-11T16:43:27)

151 suspects (0 errored) against a registry of 713 works. Gate config `59d26cfa7b1c`, pipeline 1.3.0.

## Alterations that must be caught (copy / classical / platform)

| relation | n | retrieved (in top-k) | Tier 1 (natural) | Tier 1/2 (natural) | any claim reported | evidence claim reported | evidence on WRONG work |
|---|---|---|---|---|---|---|---|
| classical | 70 | 100.0% | 48.6% | 48.6% | 51.4% | 47.1% | 1.4% |
| copy | 1 | 100.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0.0% |
| platform | 10 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% |

### Per edit (worst first)

| edit | n | retrieved | Tier 1 | any claim | main reasons for not Tier 1 |
|---|---|---|---|---|---|
| crop_50 | 3 | 100.0% | 33.3% | 33.3% | not_credible:insufficient_coverage x1; not_credible:not_enough_inliers x1 |
| crop_10 | 39 | 100.0% | 38.5% | 43.6% | not_credible:not_enough_matches x17; not_credible:insufficient_coverage x4 |
| screenshot_frame | 8 | 100.0% | 62.5% | 62.5% | not_credible:insufficient_coverage x2; not_credible:not_enough_matches x1 |
| crop_30 | 20 | 100.0% | 65.0% | 65.0% | not_credible:insufficient_coverage x3; not_credible:inconsistent_matches x2 |
| whatsapp_roundtrip | 10 | 100.0% | 100.0% | 100.0% |  |

### Per platform (worst first)

| platform | n | retrieved | Tier 1 | any claim | main reasons for not Tier 1 |
|---|---|---|---|---|---|
| whatsapp | 10 | 100.0% | 100.0% | 100.0% |  |

### Per image category (worst first)

| category | n | retrieved | Tier 1 | any claim | main reasons for not Tier 1 |
|---|---|---|---|---|---|
| whitebackground | 3 | 100.0% | 0.0% | 0.0% | not_credible:not_enough_matches x2; not_credible:insufficient_coverage x1 |
| photo_pattern | 1 | 100.0% | 0.0% | 0.0% | not_credible:not_enough_matches x1 |
| photo_night | 1 | 100.0% | 0.0% | 0.0% | not_credible:not_enough_matches x1 |
| unrelated | 1 | 100.0% | 0.0% | 100.0% | graded_TIER2 x1 |
| illustration | 28 | 100.0% | 28.6% | 28.6% | not_credible:not_enough_matches x9; not_credible:insufficient_coverage x7 |
| alphatransparent | 10 | 100.0% | 40.0% | 50.0% | not_credible:not_enough_matches x4; low_information x1 |
| logo | 9 | 100.0% | 55.6% | 55.6% | not_credible:not_enough_matches x3; not_credible:insufficient_coverage x1 |
| photo_document | 3 | 100.0% | 66.7% | 100.0% | graded_RELATED_DIFFERENT_CAPTURE x1 |
| heavyart | 20 | 100.0% | 100.0% | 100.0% |  |
| photopastaportrait | 1 | 100.0% | 100.0% | 100.0% |  |
| photo_studio | 1 | 100.0% | 100.0% | 100.0% |  |
| photo_architecture | 1 | 100.0% | 100.0% | 100.0% |  |
| ball | 1 | 100.0% | 100.0% | 100.0% |  |
| perfume | 1 | 100.0% | 100.0% | 100.0% |  |

### Why positives were not Tier 1

| reason | count |
|---|---|
| not_credible:not_enough_matches | 20 |
| not_credible:insufficient_coverage | 10 |
| not_credible:inconsistent_matches | 2 |
| not_credible:insufficient_spread | 1 |
| not_credible:not_enough_inliers | 1 |
| low_information | 1 |
| graded_RELATED_DIFFERENT_CAPTURE | 1 |
| graded_TIER2 | 1 |

## What must NOT be claimed as evidence (false-evidence rate, 95% upper bound)

| relation | n | false evidence claims | upper bound | natural Tier1/2 on any candidate | lead claims |
|---|---|---|---|---|---|
| sibling | 20 | 0 (0.0%) | <= 13.9% | 5 | 9 (45.0%) |
| unrelated | 50 | 0 (0.0%) | <= 5.8% | 0 | 0 (0.0%) |
| **all negatives** | 70 | 0 (0.0%) | <= 4.2% |  |  |

A *lead* on a sibling / same-template pair is acceptable (it asks a human to look); a lead on an `unrelated` image is a false lead.

## Gate vs classic fingerprint scores

Positives = copy/classical/platform + ai_light/ai_medium (80); negatives = siblings, templates, hard and unrelated (70). TPR at a fixed false-positive rate on those negatives:

| score | TPR @ 1% FPR | TPR @ 0.1% FPR | n negatives |
|---|---|---|---|
| pHash | 12.5% | 12.5% | 70 |
| CLIP embedding | 15.0% | 13.8% | 70 |
| fused confidence | 15.0% | 13.8% | 70 |

Operating points as deployed (positives = copy/classical/platform):

| system | detects positives | fires on hard negatives | fires on unrelated |
|---|---|---|---|
| classic fused >= likely (0.996) | 30.9% | 70.0% | 0.0% |
| classic fused >= possible (0.27) | 75.3% | 100.0% | 46.0% |
| gate: evidence claim (Tier 1/2) on the right work | 53.1% | 0.0% | 0.0% |
| gate: any claim (evidence or lead) on the right work | 58.0% | 45.0% | 0.0% |

## Latency (seconds, CPU)

| stage | p50 | p95 | max |
|---|---|---|---|
| g0_normalize | 0.17 | 1.09 | 2.73 |
| g1_retrieve | 1.24 | 2.42 | 7.89 |
| g2_verify | 3.81 | 9.68 | 24.24 |
| g3_dense | 0.00 | 2.46 | 6.31 |
| g4_classify | 0.00 | 0.00 | 0.00 |
| candidates_wall | 1.66 | 4.45 | 9.46 |
| g5_evidence | 0.00 | 0.00 | 0.16 |
| total | 3.59 | 6.84 | 18.76 |

Candidates verified per check: median 5, max 6. g2-g4 are sums over candidates; `candidates_wall` is the elapsed time (they run concurrently).

Per-candidate metrics: `per_candidate.csv`. Every false-evidence case, false lead and missed positive: `failures.csv`.
