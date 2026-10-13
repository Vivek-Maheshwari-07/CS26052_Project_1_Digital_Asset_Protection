# Spike Results\n\n## Table A (Base pipeline + DINOv2)\n| pair                       |   phash |   clip |   dino |   dino_patchmean |   fused |
|:---------------------------|--------:|-------:|-------:|-----------------:|--------:|
| ORIGraw__MINIMAL           |   0.625 |  0.803 |  0.907 |            0.961 |   0.992 |
| ORIGclean__MINIMAL         |   0.906 |  0.802 |  0.911 |            0.964 |   1     |
| ORIGraw__MEDIUM            |   0.594 |  0.693 |  0.563 |            0.726 |   0.791 |
| ORIGclean__MEDIUM          |   0.594 |  0.692 |  0.561 |            0.72  |   0.787 |
| ORIGraw__HEAVY             |   0.469 |  0.49  |  0.369 |            0.556 |   0.003 |
| ORIGclean__HEAVY           |   0.531 |  0.491 |  0.368 |            0.548 |   0.006 |
| ORIGraw__SIBLING           |   0.5   |  0.815 |  0.847 |            0.878 |   0.971 |
| ORIGclean__SIBLING         |   0.625 |  0.813 |  0.849 |            0.881 |   0.994 |
| ORIGclean__ORIGclean       |   1     |  1     |  1     |            1     |   1     |
| ORIGclean__crop_90         |   1     |  0.97  |  0.976 |            0.985 |   1     |
| ORIGclean__crop_50         |   0.594 |  0.913 |  0.878 |            0.893 |   0.999 |
| ORIGclean__crop_25         |   0.5   |  0.901 |  0.795 |            0.795 |   0.997 |
| ORIGclean__crop_10         |   0.438 |  0.813 |  0.553 |            0.608 |   0.932 |
| ORIGclean__crop_50_offset  |   0.5   |  0.91  |  0.844 |            0.883 |   0.998 |
| ORIGclean__hflip           |   0.5   |  0.991 |  0.923 |            0.936 |   1     |
| ORIGclean__rot15           |   0.594 |  0.914 |  0.854 |            0.806 |   0.999 |
| ORIGclean__bright_contrast |   0.969 |  0.94  |  0.982 |            0.99  |   1     |
| ORIGclean__grayscale       |   1     |  0.882 |  0.965 |            0.985 |   1     |
| ORIGclean__noise_20        |   1     |  0.916 |  0.953 |            0.982 |   1     |
| ORIGclean__blur_3          |   1     |  0.865 |  0.949 |            0.968 |   1     |
| ORIGclean__jpeg30_resize50 |   1     |  0.939 |  0.992 |            0.995 |   1     |
| ORIGclean__text_banner     |   0.938 |  0.919 |  0.923 |            0.905 |   1     |
| ORIGclean__combo           |   0.594 |  0.88  |  0.876 |            0.893 |   0.999 |
| MINIMAL__MEDIUM            |   0.625 |  0.886 |  0.633 |            0.724 |   0.999 |
| MINIMAL__HEAVY             |   0.5   |  0.612 |  0.411 |            0.538 |   0.104 |
| MINIMAL__SIBLING           |   0.656 |  0.801 |  0.839 |            0.87  |   0.994 |
| MEDIUM__HEAVY              |   0.562 |  0.699 |  0.589 |            0.796 |   0.747 |
| MEDIUM__SIBLING            |   0.531 |  0.703 |  0.55  |            0.714 |   0.688 |
| HEAVY__SIBLING             |   0.406 |  0.542 |  0.454 |            0.642 |   0.005 |\n\n## Table B (Geometric)\n| pair                       | flipped   |   n_inliers |   inlier_ratio |   cov_s |   cov_o |   spread_s |   spread_o |   scale |      rot |   persp | sane   |
|:---------------------------|:----------|------------:|---------------:|--------:|--------:|-----------:|-----------:|--------:|---------:|--------:|:-------|
| ORIGraw__MINIMAL           | False     |         493 |          0.622 |   0.52  |   0.277 |      0.625 |      0.438 |   0.508 |   -1.157 |   0     | True   |
| ORIGclean__MINIMAL         | False     |         493 |          0.609 |   0.506 |   0.49  |      0.625 |      0.625 |   0.942 |   -0.329 |   0     | True   |
| ORIGraw__MEDIUM            | False     |         149 |          0.772 |   0.103 |   0.062 |      0.312 |      0.312 |   0.821 |   13.487 |   0     | True   |
| ORIGclean__MEDIUM          | False     |         138 |          0.711 |   0.08  |   0.093 |      0.312 |      0.312 |   1.554 |   -0.309 |   0.001 | True   |
| ORIGraw__HEAVY             | False     |           5 |          0.227 |   0     |   0     |      0     |      0     |   0     |    0     |   0     | False  |
| ORIGclean__HEAVY           | False     |           5 |          0.238 |   0     |   0     |      0     |      0     |   0     |    0     |   0     | False  |
| ORIGraw__SIBLING           | False     |         464 |          0.619 |   0.32  |   0.213 |      0.5   |      0.562 |   0.595 |    0.997 |   0     | True   |
| ORIGclean__SIBLING         | False     |         552 |          0.609 |   0.321 |   0.389 |      0.375 |      0.5   |   1.071 |   -0.296 |   0     | True   |
| ORIGclean__ORIGclean       | False     |        3974 |          1     |   0.882 |   0.882 |      0.938 |      0.938 |   1     |    0     |   0     | True   |
| ORIGclean__crop_90         | False     |        2834 |          0.993 |   0.875 |   0.787 |      0.938 |      0.938 |   0.948 |    0.001 |   0     | True   |
| ORIGclean__crop_50         | False     |        1739 |          0.99  |   0.889 |   0.444 |      1     |      0.938 |   0.707 |    0.011 |   0     | True   |
| ORIGclean__crop_25         | False     |         886 |          0.998 |   0.885 |   0.221 |      1     |      0.25  |   0.5   |   -0.008 |   0     | True   |
| ORIGclean__crop_10         | False     |         263 |          0.996 |   0.802 |   0.08  |      1     |      0.25  |   0.315 |   -0.017 |   0     | True   |
| ORIGclean__crop_50_offset  | False     |        1918 |          0.99  |   0.909 |   0.453 |      1     |      0.562 |   0.706 |    0.001 |   0     | True   |
| ORIGclean__hflip           | True      |        3974 |          1     |   0.882 |   0.882 |      0.938 |      0.938 |   1     |    0     |   0     | True   |
| ORIGclean__rot15           | False     |        1383 |          0.936 |   0.532 |   0.81  |      0.938 |      0.938 |   1.174 |   15.004 |   0     | True   |
| ORIGclean__bright_contrast | False     |        2828 |          0.989 |   0.861 |   0.861 |      0.938 |      0.938 |   1     |    0.001 |   0     | True   |
| ORIGclean__grayscale       | False     |        3861 |          0.999 |   0.88  |   0.88  |      0.938 |      0.938 |   1     |   -0     |   0     | True   |
| ORIGclean__noise_20        | False     |        1087 |          0.956 |   0.817 |   0.816 |      0.938 |      0.938 |   1.001 |    0.011 |   0     | True   |
| ORIGclean__blur_3          | False     |          94 |          0.989 |   0.662 |   0.662 |      0.938 |      0.938 |   0.999 |    0.026 |   0     | True   |
| ORIGclean__jpeg30_resize50 | False     |        1337 |          0.991 |   0.854 |   0.854 |      0.938 |      0.938 |   1     |    0.012 |   0     | True   |
| ORIGclean__text_banner     | False     |        3040 |          0.999 |   0.877 |   0.877 |      0.938 |      0.938 |   1     |    0     |   0     | True   |
| ORIGclean__combo           | False     |        1337 |          0.979 |   0.873 |   0.435 |      1     |      0.938 |   0.706 |   -0     |   0     | True   |
| MINIMAL__MEDIUM            | False     |         223 |          0.766 |   0.121 |   0.137 |      0.312 |      0.312 |   1.385 |    5.237 |   0     | True   |
| MINIMAL__HEAVY             | True      |           7 |          0.219 |   0     |   0     |      0     |      0     |   0     |    0     |   0     | False  |
| MINIMAL__SIBLING           | False     |         199 |          0.413 |   0.125 |   0.172 |      0.312 |      0.438 |   1.228 |    0.02  |   0     | True   |
| MEDIUM__HEAVY              | True      |           8 |          0.25  |   0.019 |   0.011 |      0.188 |      0.125 |   0.444 | -110.397 |   0.002 | False  |
| MEDIUM__SIBLING            | False     |         128 |          0.631 |   0.053 |   0.067 |      0.188 |      0.25  |   0.733 |   -2.464 |   0     | True   |
| HEAVY__SIBLING             | True      |          15 |          0.242 |   0.046 |   0     |      0.125 |      0.062 |   0     |   47.298 |   0.031 | False  |\n\n## Table C (Dense Evidence)\n| pair                       |   resid_med |   resid_p90 |   ncc_median |   frac_ncc_gt_0.8 |   ssim |   edge_corr |   flow_median |   flow_p90 |   frac_flow_gt_1px |
|:---------------------------|------------:|------------:|-------------:|------------------:|-------:|------------:|--------------:|-----------:|-------------------:|
| ORIGraw__MINIMAL           |          14 |          56 |        0.043 |             0.04  |  0.495 |       0.417 |         6.943 |     27.787 |              0.972 |
| ORIGclean__MINIMAL         |          16 |          49 |        0.026 |             0.013 |  0.539 |       0.353 |        12.083 |     23.435 |              0.99  |
| ORIGraw__MEDIUM            |          36 |          75 |        0.006 |             0     |  0.396 |       0.198 |        19.544 |     56.218 |              0.995 |
| ORIGclean__MEDIUM          |          36 |          66 |       -0     |             0     |  0.494 |       0.12  |        38.11  |     91.48  |              0.997 |
| ORIGraw__HEAVY             |          -1 |          -1 |       -1     |             0     | -1     |      -1     |        -1     |     -1     |              0     |
| ORIGclean__HEAVY           |          -1 |          -1 |       -1     |             0     | -1     |      -1     |        -1     |     -1     |              0     |
| ORIGraw__SIBLING           |          24 |          69 |        0.043 |             0.028 |  0.489 |       0.382 |        12.959 |    166.287 |              0.985 |
| ORIGclean__SIBLING         |          22 |          62 |        0.022 |             0.061 |  0.564 |       0.364 |        16.034 |     37.24  |              0.986 |
| ORIGclean__ORIGclean       |           0 |           0 |        1     |             1     |  1     |       1     |         0     |      0     |              0     |
| ORIGclean__crop_90         |           1 |           2 |        0.997 |             1     |  0.99  |       0.976 |         0.03  |      0.159 |              0.034 |
| ORIGclean__crop_50         |           1 |           2 |        0.998 |             1     |  0.988 |       0.983 |         0.034 |      0.15  |              0.025 |
| ORIGclean__crop_25         |           1 |           1 |        0.997 |             0.843 |  0.986 |       0.988 |         0.034 |      0.19  |              0.04  |
| ORIGclean__crop_10         |           1 |           2 |        0.996 |             0.882 |  0.977 |       0.978 |         0.039 |      0.205 |              0.041 |
| ORIGclean__crop_50_offset  |           1 |           2 |        0.998 |             1     |  0.993 |       0.995 |         0.02  |      0.091 |              0.018 |
| ORIGclean__hflip           |           0 |           0 |        1     |             1     |  1     |       1     |         0     |      0     |              0     |
| ORIGclean__rot15           |           1 |           7 |        0.886 |             0.848 |  0.956 |       0.975 |         0.125 |      0.366 |              0.024 |
| ORIGclean__bright_contrast |           7 |          17 |        0.98  |             0.91  |  0.938 |       0.936 |         0.261 |      7.332 |              0.225 |
| ORIGclean__grayscale       |           7 |          25 |        0.999 |             1     |  0.978 |       1     |         0.009 |      0.043 |              0     |
| ORIGclean__noise_20        |          10 |          25 |        0.68  |             0.126 |  0.476 |       0.891 |         0.47  |      3.238 |              0.312 |
| ORIGclean__blur_3          |           6 |          29 |        0.245 |             0     |  0.659 |       0.459 |         1.38  |      5.791 |              0.625 |
| ORIGclean__jpeg30_resize50 |           3 |          11 |        0.816 |             0.605 |  0.899 |       0.921 |         0.343 |      3.175 |              0.289 |
| ORIGclean__text_banner     |          17 |          42 |        0.998 |             0.897 |  0.856 |       0.764 |         0.296 |     10.946 |              0.272 |
| ORIGclean__combo           |           9 |          23 |        0.919 |             0.978 |  0.911 |       0.966 |         0.161 |      2.551 |              0.193 |
| MINIMAL__MEDIUM            |          42 |          86 |        0.001 |             0     |  0.448 |       0.219 |        28.517 |     85.808 |              0.993 |
| MINIMAL__HEAVY             |          -1 |          -1 |       -1     |             0     | -1     |      -1     |        -1     |     -1     |              0     |
| MINIMAL__SIBLING           |          30 |          81 |        0.012 |             0.002 |  0.471 |       0.301 |        22.395 |     79.322 |              0.983 |
| MEDIUM__HEAVY              |          44 |          88 |        0     |             0     |  0.491 |       0.061 |        32.269 |     69.483 |              0.999 |
| MEDIUM__SIBLING            |          44 |          97 |        0.006 |             0     |  0.481 |       0.226 |        36.855 |    101.539 |              0.998 |
| HEAVY__SIBLING             |          43 |          90 |       -0.005 |             0     |  0.496 |       0.062 |        51.696 |    106.498 |              1     |\n\n## Failures\n- Failed ORIGraw__MINIMAL: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n- Failed ORIGclean__MINIMAL: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n- Failed ORIGraw__MEDIUM: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n- Failed ORIGclean__MEDIUM: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n- Failed ORIGraw__SIBLING: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n- Failed ORIGclean__SIBLING: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n- Failed ORIGclean__crop_50: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n- Failed ORIGclean__hflip: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n- Failed ORIGclean__text_banner: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n- Failed ORIGclean__combo: 'int' object is not subscriptable\nTraceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 520, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                                                                                      ~~~~~~~~~~~~^^^^^
TypeError: 'int' object is not subscriptable
\n\n\n## Wall Clocks\n- ORIGraw__MINIMAL: 2.63s\n- ORIGclean__MINIMAL: 3.18s\n- ORIGraw__MEDIUM: 1.76s\n- ORIGclean__MEDIUM: 2.81s\n- ORIGraw__HEAVY: 0.66s\n- ORIGclean__HEAVY: 0.84s\n- ORIGraw__SIBLING: 1.57s\n- ORIGclean__SIBLING: 2.76s\n- ORIGclean__ORIGclean: 2.80s\n- ORIGclean__crop_90: 2.48s\n- ORIGclean__crop_50: 2.06s\n- ORIGclean__crop_25: 1.79s\n- ORIGclean__crop_10: 1.66s\n- ORIGclean__crop_50_offset: 2.09s\n- ORIGclean__hflip: 2.56s\n- ORIGclean__rot15: 2.67s\n- ORIGclean__bright_contrast: 2.51s\n- ORIGclean__grayscale: 2.44s\n- ORIGclean__noise_20: 2.67s\n- ORIGclean__blur_3: 2.35s\n- ORIGclean__jpeg30_resize50: 2.37s\n- ORIGclean__text_banner: 2.70s\n- ORIGclean__combo: 2.04s\n- MINIMAL__MEDIUM: 2.80s\n- MINIMAL__HEAVY: 0.75s\n- MINIMAL__SIBLING: 3.06s\n- MEDIUM__HEAVY: 2.38s\n- MEDIUM__SIBLING: 3.17s\n- HEAVY__SIBLING: 3.09s\n