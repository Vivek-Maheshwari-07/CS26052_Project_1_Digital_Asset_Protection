# Tier 1 threshold sweep

638 positives (copy/classical/platform), 71 negatives (siblings, templates, hard, unrelated); 3000 threshold combinations. A negative counts as a false Tier 1 if *any* of its candidates passes.

**Current settings** (p90<=20.0, flow<=3.0, median<=8.0, changed<=0.15, hp>=0.1): recall 80.4%, false Tier 1 on 2 of 71 negatives.

## Best combinations with zero false Tier 1 on this data

| thresholds | recall |
|---|---|
| p90<=40, flow<=5.0, median<=4, changed<=0.1, hp>=0.0 | 86.1% |
| p90<=40, flow<=5.0, median<=4, changed<=0.1, hp>=0.1 | 86.1% |
| p90<=40, flow<=5.0, median<=4, changed<=0.15, hp>=0.0 | 86.1% |
| p90<=40, flow<=5.0, median<=4, changed<=0.15, hp>=0.1 | 86.1% |
| p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.0 | 86.1% |
| p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.1 | 86.1% |
| p90<=40, flow<=5.0, median<=4, changed<=0.4, hp>=0.0 | 86.1% |
| p90<=40, flow<=5.0, median<=4, changed<=0.4, hp>=0.1 | 86.1% |
| p90<=40, flow<=2.0, median<=4, changed<=0.05, hp>=0.0 | 85.9% |
| p90<=40, flow<=2.0, median<=4, changed<=0.05, hp>=0.1 | 85.9% |
| p90<=40, flow<=2.0, median<=4, changed<=0.1, hp>=0.0 | 85.9% |
| p90<=40, flow<=2.0, median<=4, changed<=0.1, hp>=0.1 | 85.9% |

## Grouped 5-fold cross-validation (thresholds chosen on train folds only)

Held-out recall: 85.9% mean; held-out false Tier 1: 0 of 71 negatives (upper 95% bound 4.1%).

Chosen per fold: p90<=40, flow<=3.0, median<=4, changed<=0.15, hp>=0.1 | p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.0 | p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.0 | p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.0 | p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.0

## Metric distributions (5th / 50th / 95th percentile, credible candidates only)

| metric | positives (true work) | negatives (all candidates) |
|---|---|---|
| residual_p90 | 0.00 / 7.00 / 31.20 | 16.00 / 43.00 / 93.55 |
| residual_median | 0.00 / 1.00 / 5.00 | 5.00 / 9.00 / 29.20 |
| changed_frac | 0.00 / 0.00 / 0.02 | 0.00 / 0.05 / 0.32 |
| flow_median_px | 0.01 / 0.06 / 0.79 | 0.28 / 3.12 / 26.28 |
| hp_ncc | 0.27 / 0.98 / 1.00 | 0.01 / 0.09 / 0.82 |
| noise_ncc | 0.37 / 0.93 / 1.00 | -0.01 / -0.00 / 0.01 |

A metric helps only if these ranges barely overlap. `noise_ncc` is logged but not used by the classifier.
