# Tier 1 threshold sweep

1254 positives (copy/classical/platform), 70 negatives (siblings, templates, hard, unrelated); 3000 threshold combinations. A negative counts as a false Tier 1 if *any* of its candidates passes.

**Current settings** (p90<=20.0, flow<=3.0, median<=4.0, changed<=0.15, hp>=0.1): recall 83.7%, false Tier 1 on 0 of 70 negatives.

## Best combinations with zero false Tier 1 on this data

| thresholds | recall |
|---|---|
| p90<=40, flow<=5.0, median<=4, changed<=0.1, hp>=0.0 | 88.3% |
| p90<=40, flow<=5.0, median<=4, changed<=0.1, hp>=0.1 | 88.3% |
| p90<=40, flow<=5.0, median<=4, changed<=0.15, hp>=0.0 | 88.3% |
| p90<=40, flow<=5.0, median<=4, changed<=0.15, hp>=0.1 | 88.3% |
| p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.0 | 88.3% |
| p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.1 | 88.3% |
| p90<=40, flow<=5.0, median<=4, changed<=0.4, hp>=0.0 | 88.3% |
| p90<=40, flow<=5.0, median<=4, changed<=0.4, hp>=0.1 | 88.3% |
| p90<=40, flow<=2.0, median<=4, changed<=0.05, hp>=0.0 | 88.2% |
| p90<=40, flow<=2.0, median<=4, changed<=0.05, hp>=0.1 | 88.2% |
| p90<=40, flow<=2.0, median<=4, changed<=0.1, hp>=0.0 | 88.2% |
| p90<=40, flow<=2.0, median<=4, changed<=0.1, hp>=0.1 | 88.2% |

## Grouped 5-fold cross-validation (thresholds chosen on train folds only)

Held-out recall: 89.2% mean; held-out false Tier 1: 3 of 70 negatives (upper 95% bound 10.7%).

Chosen per fold: p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.0 | p90<=40, flow<=3.0, median<=4, changed<=0.15, hp>=0.1 | p90<=40, flow<=5.0, median<=16, changed<=0.1, hp>=0.0 | p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.0 | p90<=40, flow<=5.0, median<=4, changed<=0.25, hp>=0.0

## Metric distributions (5th / 50th / 95th percentile, credible candidates only)

| metric | positives (true work) | negatives (all candidates) |
|---|---|---|
| residual_p90 | 1.00 / 6.00 / 28.00 | 20.40 / 55.00 / 94.60 |
| residual_median | 0.00 / 1.00 / 5.00 | 5.80 / 10.00 / 30.40 |
| changed_frac | 0.00 / 0.00 / 0.01 | 0.00 / 0.08 / 0.33 |
| flow_median_px | 0.01 / 0.05 / 0.61 | 1.38 / 3.50 / 26.36 |
| hp_ncc | 0.36 / 0.98 / 1.00 | 0.00 / 0.05 / 0.53 |
| noise_ncc | 0.37 / 0.87 / 1.00 | -0.01 / -0.00 / 0.01 |

A metric helps only if these ranges barely overlap. `noise_ncc` is logged but not used by the classifier.
