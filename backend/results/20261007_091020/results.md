# Spike Results 20261007_091020

**Config**
- ORIG crop box: (0, 224, 446, 800)
- Seed: 42
- OpenCV: 5.0.0
- Transformers: 5.18.0

## Regression Check (vs Expected)
- MINIMAL: abs diff 0.0042
- MEDIUM: abs diff 0.0063
- HEAVY: abs diff 0.0029
- SIBLING: abs diff 0.0045

## Table A (Base pipeline + DINOv2)
| pair                       |   phash |   clip |   dino |   dino_patchmean |   fused |
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
| HEAVY__SIBLING             |   0.406 |  0.542 |  0.454 |            0.642 |   0.005 |

## Table B (Geometric)
| pair                       | flipped   |   n_inliers |   inlier_ratio |   cov_s |   cov_o |   spread_s |   spread_o |   scale |      rot |   persp | sane   |
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
| HEAVY__SIBLING             | True      |          15 |          0.242 |   0.046 |   0     |      0.125 |      0.062 |   0     |   47.298 |   0.031 | False  |

## Table C (Dense Evidence)
| pair                       |   resid_med |   resid_p90 |   ncc_median |   frac_ncc_gt_0.8 |   ssim |   edge_corr |   flow_median |   flow_p90 |   frac_flow_gt_1px |
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
| HEAVY__SIBLING             |          43 |          90 |       -0.005 |             0     |  0.496 |       0.062 |        51.696 |    106.498 |              1     |

## Locality Diagnostic
| pair               |   R0C0 |   R0C1 |   R0C2 |   R0C3 |   R1C0 |   R1C1 |   R1C2 |   R1C3 |   R2C0 |   R2C1 |   R2C2 |   R2C3 |   R3C0 |   R3C1 |   R3C2 |   R3C3 |
|:-------------------|-------:|-------:|-------:|-------:|-------:|-------:|-------:|-------:|-------:|-------:|-------:|-------:|-------:|-------:|-------:|-------:|
| ORIGclean__MINIMAL | 11.415 |  7.775 |  6.274 |  7.002 | 16.573 | 16.398 | 16.266 | 15.585 | 19.663 |  9.029 |  8.02  | 11.865 |  7.692 |  9.008 | 13.509 | 18.531 |
| ORIGclean__MEDIUM  | 73.115 | 30.65  | 55.533 | 97.862 | 75.175 | 12.667 |  9.615 | 55.07  | 47.321 |  8.943 |  7.201 | 28.374 | 50.583 | 47.012 | 43.997 | 46.236 |
| ORIGclean__SIBLING |  9.629 |  3.967 | 14.278 | 46.579 | 19.525 | 20.728 | 20.514 | 12.763 | 24.868 |  7.273 |  7.286 | 20.214 | 16.555 |  8.564 | 17.529 | 19.438 |

## Flow Robustness
No data

## AI Origin Exploration
| image           |   umm_maybe_asis |   Ateeqq_asis |   umm_maybe_recomp |   Ateeqq_recomp |
|:----------------|-----------------:|--------------:|-------------------:|----------------:|
| ORIG            |            0.965 |         0.324 |              0.885 |           0.017 |
| MINIMAL         |            0.046 |         0.987 |              0.049 |           0.995 |
| MEDIUM          |            0.033 |         1     |              0.037 |           1     |
| HEAVY           |            0.038 |         0.998 |              0.056 |           0.997 |
| SIBLING         |            0.042 |         0.999 |              0.029 |           0.999 |
| crop_90         |            0.059 |         0.109 |              0.016 |           0.002 |
| crop_50         |            0.161 |         0.997 |              0.113 |           0.9   |
| crop_25         |            0.207 |         0.003 |              0.192 |           0.001 |
| crop_10         |            0.551 |         0.002 |              0.468 |           0.001 |
| crop_50_offset  |            0.164 |         0.974 |              0.138 |           0.744 |
| hflip           |            0.012 |         0.806 |              0.007 |           0.007 |
| rot15           |            0.053 |         1     |              0.008 |           0.999 |
| bright_contrast |            0.073 |         0.999 |              0.122 |           0.999 |
| grayscale       |            0.015 |         0.002 |              0.012 |           0.002 |
| noise_20        |            0.071 |         0.001 |              0.016 |           0     |
| blur_3          |            0.063 |         0.001 |              0.019 |           0.001 |
| jpeg30_resize50 |            0.008 |         0.003 |              0.025 |           0.005 |
| text_banner     |            0.052 |         0.998 |              0.009 |           0.985 |
| combo           |            0.218 |         0.996 |              0.238 |           0.997 |
| phone_38906     |            0.045 |         1     |              0.041 |           1     |
| phone_38915     |            0.223 |         1     |              0.262 |           1     |
| phone_38927     |            0.079 |         1     |              0.088 |           1     |
| phone_38930     |            0.04  |         1     |              0.045 |           1     |
| phone_38936     |            0.099 |         1     |              0.068 |           1     |
| phone_38942     |            0.03  |         1     |              0.023 |           1     |
| phone_38948     |            0.12  |         1     |              0.146 |           1     |
| phone_39686     |            0.037 |         1     |              0.024 |           1     |
| phone_39692     |            0.291 |         1     |              0.229 |           1     |
| phone_39695     |            0.087 |         1     |              0.065 |           1     |
| phone_39701     |            0.126 |         1     |              0.076 |           1     |
| phone_39707     |            0.084 |         1     |              0.044 |           1     |
| phone_39713     |            0.147 |         1     |              0.166 |           1     |
| phone_39716     |            0.069 |         1     |              0.074 |           1     |
| phone_41076     |            0.022 |         1     |              0.021 |           1     |
| phone_42623     |            0.081 |         1     |              0.101 |           1     |
| phone_42638     |            0.224 |         1     |              0.231 |           1     |
| phone_44365     |            0.038 |         1     |              0.038 |           1     |
| phone_44368     |            0.208 |         1     |              0.148 |           1     |
| phone_44371     |            0.041 |         1     |              0.06  |           1     |
| phone_44378     |            0.082 |         1     |              0.068 |           1     |
| phone_44381     |            0.188 |         1     |              0.123 |           1     |
| phone_44385     |            0.04  |         1     |              0.034 |           1     |
| phone_47820     |            0.05  |         1     |              0.034 |           1     |
| phone_47823     |            0.15  |         1     |              0.153 |           1     |
| phone_47826     |            0.255 |         1     |              0.186 |           1     |
| phone_47831     |            0.132 |         1     |              0.156 |           1     |
| phone_47836     |            0.141 |         1     |              0.154 |           1     |
| phone_47840     |            0.019 |         0.996 |              0.016 |           0.996 |
| phone_47843     |            0.101 |         0.999 |              0.071 |           0.999 |
| phone_47846     |            0.082 |         1     |              0.071 |           1     |
| phone_47849     |            0.024 |         1     |              0.019 |           1     |
| phone_47851     |            0.213 |         1     |              0.235 |           1     |
| phone_47854     |            0.119 |         1     |              0.093 |           1     |
| phone_47857     |            0.161 |         1     |              0.058 |           1     |
| phone_47861     |            0.083 |         1     |              0.074 |           1     |
| phone_47864     |            0.115 |         1     |              0.052 |           1     |
| phone_47867     |            0.074 |         1     |              0.074 |           1     |
| phone_47870     |            0.073 |         1     |              0.048 |           1     |
| phone_47876     |            0.014 |         1     |              0.01  |           1     |
| phone_47879     |            0.12  |         1     |              0.063 |           1     |
| phone_48164     |            0.429 |         1     |              0.417 |           1     |
| phone_48423     |            0.077 |         1     |              0.051 |           1     |
| phone_48429     |            0.032 |         1     |              0.027 |           1     |
| phone_48435     |            0.095 |         1     |              0.083 |           1     |
| phone_48438     |            0.31  |         1     |              0.253 |           1     |
| phone_48442     |            0.068 |         1     |              0.067 |           1     |
| phone_48449     |            0.068 |         1     |              0.048 |           1     |
| phone_48476     |            0.43  |         1     |              0.383 |           1     |
| phone_48479     |            0.136 |         1     |              0.109 |           1     |
| phone_48482     |            0.281 |         1     |              0.265 |           1     |
| phone_48485     |            0.156 |         1     |              0.129 |           1     |
| phone_HEAVY     |            0.036 |         0.997 |              0.038 |           0.923 |
| phone_MEDIUM    |            0.026 |         1     |              0.036 |           1     |
| phone_MINIMAL   |            0.043 |         0.99  |              0.044 |           0.938 |
| phone_ORIG      |            0.958 |         0.216 |              0.942 |           0.016 |
| phone_SIBLING   |            0.035 |         0.999 |              0.022 |           0.999 |

## Failures
- Panel failed ORIGraw__MEDIUM: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\features\src\draw.cpp:242: error: (-215:Assertion failed) i2 >= 0 && i2 < static_cast<int>(keypoints2.size()) in function 'cv::drawMatches'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 404, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\features\src\draw.cpp:242: error: (-215:Assertion failed) i2 >= 0 && i2 < static_cast<int>(keypoints2.size()) in function 'cv::drawMatches'


- Panel failed ORIGclean__MEDIUM: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\features\src\draw.cpp:242: error: (-215:Assertion failed) i2 >= 0 && i2 < static_cast<int>(keypoints2.size()) in function 'cv::drawMatches'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 404, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\features\src\draw.cpp:242: error: (-215:Assertion failed) i2 >= 0 && i2 < static_cast<int>(keypoints2.size()) in function 'cv::drawMatches'


- Panel failed ORIGclean__blur_3: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\features\src\draw.cpp:242: error: (-215:Assertion failed) i2 >= 0 && i2 < static_cast<int>(keypoints2.size()) in function 'cv::drawMatches'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 404, in <module>
    match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\features\src\draw.cpp:242: error: (-215:Assertion failed) i2 >= 0 && i2 < static_cast<int>(keypoints2.size()) in function 'cv::drawMatches'


- Flow Robustness fail ORIGclean__MINIMAL 512: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__MINIMAL 1024: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__MEDIUM 512: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__MEDIUM 1024: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__SIBLING 512: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__SIBLING 1024: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__crop_50 512: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__crop_50 1024: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__noise_20 512: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__noise_20 1024: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__blur_3 512: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Flow Robustness fail ORIGclean__blur_3 1024: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'

Traceback (most recent call last):
  File "C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend\eval\spike\run_spike.py", line 483, in <module>
    A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
cv2.error: OpenCV(5.0.0) D:\a\opencv-python\opencv-python\opencv\modules\geometry\src\ptsetreg.cpp:1155: error: (-5:Bad argument) Unknown or unsupported robust estimation method in function 'cv::estimateAffinePartial2D'


- Missing panels: ['ORIGclean__MEDIUM', 'ORIGraw__MEDIUM', 'ORIGclean__blur_3']


## Wall Clocks
- ORIGraw__MINIMAL_G1: 0.34s
- ORIGraw__MINIMAL_G2: 0.35s
- ORIGraw__MINIMAL_G3: 1.55s
- ORIGraw__MINIMAL_Panels: 0.43s
- ORIGclean__MINIMAL_G1: 0.47s
- ORIGclean__MINIMAL_G2: 1.76s
- ORIGclean__MINIMAL_G3: 2.06s
- ORIGclean__MINIMAL_Panels: 0.77s
- ORIGraw__MEDIUM_G1: 0.13s
- ORIGraw__MEDIUM_G2: 0.53s
- ORIGraw__MEDIUM_G3: 1.12s
- ORIGraw__MEDIUM_Panels: 0.05s
- ORIGclean__MEDIUM_G1: 0.19s
- ORIGclean__MEDIUM_G2: 0.87s
- ORIGclean__MEDIUM_G3: 2.28s
- ORIGclean__MEDIUM_Panels: 0.02s
- ORIGraw__HEAVY_G1: 0.13s
- ORIGraw__HEAVY_G2: 0.00s
- ORIGraw__HEAVY_G3: 0.00s
- ORIGraw__HEAVY_Panels: 0.00s
- ORIGclean__HEAVY_G1: 0.14s
- ORIGclean__HEAVY_G2: 0.00s
- ORIGclean__HEAVY_G3: 0.00s
- ORIGclean__HEAVY_Panels: 0.00s
- ORIGraw__SIBLING_G1: 0.27s
- ORIGraw__SIBLING_G2: 0.16s
- ORIGraw__SIBLING_G3: 1.08s
- ORIGraw__SIBLING_Panels: 0.39s
- ORIGclean__SIBLING_G1: 0.30s
- ORIGclean__SIBLING_G2: 0.57s
- ORIGclean__SIBLING_G3: 2.46s
- ORIGclean__SIBLING_Panels: 0.84s
- ORIGclean__ORIGclean_G1: 0.37s
- ORIGclean__ORIGclean_G2: 0.10s
- ORIGclean__ORIGclean_G3: 1.91s
- ORIGclean__ORIGclean_Panels: 0.00s
- ORIGclean__crop_90_G1: 0.27s
- ORIGclean__crop_90_G2: 0.10s
- ORIGclean__crop_90_G3: 1.78s
- ORIGclean__crop_90_Panels: 0.00s
- ORIGclean__crop_50_G1: 0.17s
- ORIGclean__crop_50_G2: 0.08s
- ORIGclean__crop_50_G3: 1.63s
- ORIGclean__crop_50_Panels: 0.59s
- ORIGclean__crop_25_G1: 0.11s
- ORIGclean__crop_25_G2: 0.18s
- ORIGclean__crop_25_G3: 2.02s
- ORIGclean__crop_25_Panels: 0.00s
- ORIGclean__crop_10_G1: 0.04s
- ORIGclean__crop_10_G2: 0.09s
- ORIGclean__crop_10_G3: 1.71s
- ORIGclean__crop_10_Panels: 0.00s
- ORIGclean__crop_50_offset_G1: 0.21s
- ORIGclean__crop_50_offset_G2: 0.09s
- ORIGclean__crop_50_offset_G3: 1.84s
- ORIGclean__crop_50_offset_Panels: 0.00s
- ORIGclean__hflip_G1: 0.30s
- ORIGclean__hflip_G2: 0.11s
- ORIGclean__hflip_G3: 2.08s
- ORIGclean__hflip_Panels: 0.75s
- ORIGclean__rot15_G1: 0.58s
- ORIGclean__rot15_G2: 0.24s
- ORIGclean__rot15_G3: 2.41s
- ORIGclean__rot15_Panels: 0.00s
- ORIGclean__bright_contrast_G1: 0.27s
- ORIGclean__bright_contrast_G2: 0.11s
- ORIGclean__bright_contrast_G3: 2.10s
- ORIGclean__bright_contrast_Panels: 0.00s
- ORIGclean__grayscale_G1: 0.32s
- ORIGclean__grayscale_G2: 0.14s
- ORIGclean__grayscale_G3: 1.78s
- ORIGclean__grayscale_Panels: 0.00s
- ORIGclean__noise_20_G1: 0.38s
- ORIGclean__noise_20_G2: 0.14s
- ORIGclean__noise_20_G3: 2.19s
- ORIGclean__noise_20_Panels: 1.10s
- ORIGclean__blur_3_G1: 0.02s
- ORIGclean__blur_3_G2: 0.25s
- ORIGclean__blur_3_G3: 2.06s
- ORIGclean__blur_3_Panels: 0.01s
- ORIGclean__jpeg30_resize50_G1: 0.20s
- ORIGclean__jpeg30_resize50_G2: 0.10s
- ORIGclean__jpeg30_resize50_G3: 1.96s
- ORIGclean__jpeg30_resize50_Panels: 0.00s
- ORIGclean__text_banner_G1: 0.42s
- ORIGclean__text_banner_G2: 0.51s
- ORIGclean__text_banner_G3: 2.03s
- ORIGclean__text_banner_Panels: 0.00s
- ORIGclean__combo_G1: 0.21s
- ORIGclean__combo_G2: 0.09s
- ORIGclean__combo_G3: 2.06s
- ORIGclean__combo_Panels: 0.00s
- MINIMAL__MEDIUM_G1: 0.16s
- MINIMAL__MEDIUM_G2: 0.65s
- MINIMAL__MEDIUM_G3: 2.54s
- MINIMAL__MEDIUM_Panels: 0.00s
- MINIMAL__HEAVY_G1: 0.16s
- MINIMAL__HEAVY_G2: 0.00s
- MINIMAL__HEAVY_G3: 0.00s
- MINIMAL__HEAVY_Panels: 0.00s
- MINIMAL__SIBLING_G1: 0.35s
- MINIMAL__SIBLING_G2: 0.80s
- MINIMAL__SIBLING_G3: 2.21s
- MINIMAL__SIBLING_Panels: 0.00s
- MEDIUM__HEAVY_G1: 0.10s
- MEDIUM__HEAVY_G2: 0.84s
- MEDIUM__HEAVY_G3: 1.88s
- MEDIUM__HEAVY_Panels: 0.00s
- MEDIUM__SIBLING_G1: 0.15s
- MEDIUM__SIBLING_G2: 0.56s
- MEDIUM__SIBLING_G3: 2.10s
- MEDIUM__SIBLING_Panels: 0.00s
- HEAVY__SIBLING_G1: 0.16s
- HEAVY__SIBLING_G2: 0.68s
- HEAVY__SIBLING_G3: 1.80s
- HEAVY__SIBLING_Panels: 0.00s
