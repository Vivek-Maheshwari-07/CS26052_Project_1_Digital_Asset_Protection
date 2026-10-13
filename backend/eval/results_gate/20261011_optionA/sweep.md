# Tier 1 threshold sweep

81 positives (copy/classical/platform), 70 negatives (siblings, templates, hard, unrelated); 3000 threshold combinations. A negative counts as a false Tier 1 if *any* of its candidates passes.

**Current settings** (p90<=20.0, flow<=3.0, median<=4.0, changed<=0.15, hp>=0.1): recall 44.4%, false Tier 1 on 0 of 70 negatives.

## Best combinations with zero false Tier 1 on this data

| thresholds | recall |
|---|---|
| p90<=30, flow<=1.0, median<=4, changed<=0.05, hp>=0.0 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.05, hp>=0.1 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.05, hp>=0.2 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.05, hp>=0.3 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.05, hp>=0.5 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.1, hp>=0.0 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.1, hp>=0.1 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.1, hp>=0.2 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.1, hp>=0.3 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.1, hp>=0.5 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.15, hp>=0.0 | 54.3% |
| p90<=30, flow<=1.0, median<=4, changed<=0.15, hp>=0.1 | 54.3% |

## Grouped 5-fold cross-validation (thresholds chosen on train folds only)

Held-out recall: 54.7% mean; held-out false Tier 1: 1 of 70 negatives (upper 95% bound 6.6%).

Chosen per fold: p90<=40, flow<=1.0, median<=4, changed<=0.05, hp>=0.0 | p90<=30, flow<=5.0, median<=12, changed<=0.1, hp>=0.0 | p90<=40, flow<=1.0, median<=4, changed<=0.05, hp>=0.0 | p90<=40, flow<=1.0, median<=4, changed<=0.05, hp>=0.0 | p90<=40, flow<=1.0, median<=4, changed<=0.05, hp>=0.0

## Metric distributions (5th / 50th / 95th percentile, credible candidates only)

| metric | positives (true work) | negatives (all candidates) |
|---|---|---|
| residual_p90 | 2.00 / 7.00 / 24.00 | 20.40 / 55.00 / 94.60 |
| residual_median | 0.00 / 1.00 / 3.00 | 5.80 / 10.00 / 30.40 |
| changed_frac | 0.00 / 0.00 / 0.00 | 0.00 / 0.08 / 0.33 |
| flow_median_px | 0.03 / 0.06 / 0.66 | 1.38 / 3.50 / 26.36 |
| hp_ncc | 0.89 / 0.98 / 0.99 | 0.00 / 0.05 / 0.53 |
| noise_ncc | 0.32 / 0.68 / 0.98 | -0.01 / -0.00 / 0.01 |

A metric helps only if these ranges barely overlap. `noise_ncc` is logged but not used by the classifier.
