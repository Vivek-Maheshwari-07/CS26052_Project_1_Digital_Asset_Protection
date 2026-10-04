# Robustness evaluation (20261004-061543)

40 originals, 21 edit types, 840 edited copies, 32,760 unrelated pairs (negatives).

## Overall

| Method | AUC | TPR @ 1% FPR | TPR @ 0.1% FPR | Top-1 retrieval | Mean score: copy / unrelated |
|---|---|---|---|---|---|
| pHash | 0.9032 | 72.9% | 65.7% | 73.8% | 0.826 / 0.511 |
| Embedding (CLIP) | 0.9991 | 99.3% | 92.3% | 99.5% | 0.892 / 0.372 |
| Old heuristic fusion | 0.9996 | 99.6% | 93.5% | 99.6% | 0.959 / 0.477 |
| Logistic fusion (5-fold CV) | 0.9992 | 99.4% | 89.6% | 99.8% | 0.988 / 0.010 |

## Recommended settings (backend/.env)

```
FUSION_W_EMBEDDING=27.887
FUSION_W_PHASH=13.085
FUSION_BIAS=-25.773
MATCH_LIKELY=0.996
MATCH_POSSIBLE=0.27
```

Likely-match threshold: catches 89.6% of edited copies, flags 0.10% of unrelated pairs.  
Possible-match threshold: catches 99.4%, flags 1.00%.

## Detection rate per edit (TPR @ 1% FPR)

| Edit | pHash | Embedding | Old fusion | Logistic fusion |
|---|---|---|---|---|
| jpeg_q30 | 100.0% | 100.0% | 100.0% | 100.0% |
| jpeg_q10 | 100.0% | 100.0% | 100.0% | 100.0% |
| resize_25pct | 100.0% | 100.0% | 100.0% | 100.0% |
| crop_10 | 100.0% | 100.0% | 100.0% | 100.0% |
| crop_25 | 42.5% | 100.0% | 100.0% | 100.0% |
| crop_40 | 10.0% | 100.0% | 100.0% | 95.0% |
| crop_offset_30 | 7.5% | 100.0% | 100.0% | 100.0% |
| rotate_5 | 75.0% | 100.0% | 100.0% | 100.0% |
| rotate_15 | 10.0% | 97.5% | 97.5% | 97.5% |
| hflip | 0.0% | 100.0% | 100.0% | 100.0% |
| blur_r3 | 100.0% | 100.0% | 100.0% | 100.0% |
| brightness_+40 | 100.0% | 97.5% | 97.5% | 97.5% |
| contrast_x1.6 | 100.0% | 100.0% | 100.0% | 100.0% |
| saturation_x2 | 100.0% | 100.0% | 100.0% | 100.0% |
| grayscale | 100.0% | 100.0% | 100.0% | 100.0% |
| noise_s20 | 100.0% | 100.0% | 100.0% | 100.0% |
| text_overlay | 97.5% | 97.5% | 97.5% | 97.5% |
| letterbox | 12.5% | 100.0% | 100.0% | 100.0% |
| combo_crop_filter_jpeg | 70.0% | 100.0% | 100.0% | 100.0% |
| sim_ai_painterly | 100.0% | 100.0% | 100.0% | 100.0% |
| sim_ai_restyle | 100.0% | 100.0% | 100.0% | 100.0% |

## AUC per edit

| Edit | pHash | Embedding | Old fusion | Logistic fusion |
|---|---|---|---|---|
| jpeg_q30 | 1.000 | 1.000 | 1.000 | 1.000 |
| jpeg_q10 | 1.000 | 1.000 | 1.000 | 1.000 |
| resize_25pct | 1.000 | 1.000 | 1.000 | 1.000 |
| crop_10 | 1.000 | 1.000 | 1.000 | 1.000 |
| crop_25 | 0.908 | 1.000 | 1.000 | 1.000 |
| crop_40 | 0.600 | 0.999 | 0.999 | 0.999 |
| crop_offset_30 | 0.618 | 1.000 | 1.000 | 0.999 |
| rotate_5 | 0.981 | 1.000 | 1.000 | 1.000 |
| rotate_15 | 0.734 | 0.999 | 0.997 | 0.996 |
| hflip | 0.446 | 1.000 | 1.000 | 1.000 |
| blur_r3 | 1.000 | 1.000 | 1.000 | 1.000 |
| brightness_+40 | 1.000 | 0.990 | 0.997 | 0.993 |
| contrast_x1.6 | 1.000 | 1.000 | 1.000 | 1.000 |
| saturation_x2 | 1.000 | 1.000 | 1.000 | 1.000 |
| grayscale | 1.000 | 1.000 | 1.000 | 1.000 |
| noise_s20 | 1.000 | 1.000 | 1.000 | 1.000 |
| text_overlay | 0.999 | 0.999 | 1.000 | 0.999 |
| letterbox | 0.734 | 1.000 | 0.999 | 0.999 |
| combo_crop_filter_jpeg | 0.980 | 1.000 | 1.000 | 1.000 |
| sim_ai_painterly | 1.000 | 0.999 | 1.000 | 1.000 |
| sim_ai_restyle | 1.000 | 1.000 | 1.000 | 1.000 |

Notes: negatives are pairs of *different* photos, so they're easier than real look-alikes (e.g. two photos of the same landmark). Edits prefixed `sim_ai_` are simulated re-renders, not generative-model output; add real AI-edited copies with `--edited`.
