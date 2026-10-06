# ProvNet Architecture and Design Notes

## Classical Perceptual Hashing & Low-Detail Classification
- `grey_std` is computed as the standard deviation (0–255 scale) of greyscale image `g`, downscaled with `Image.Resampling.BOX` so the longest side is $\le$ 1024 to bound memory consumption for high-resolution (up to 40 MP) inputs while preserving variance statistics; images already $\le$ 1024 px are analyzed as-is.

## Wavelet Hashing (WHash) Working Resolution
- `imagehash`'s default `image_scale` depends on the input's shorter side ($2^{\lfloor\log_2(\text{min side})\rfloor}$), so the hash definition and computational cost varied with input size ($\approx 100\text{ ms}$ at 1024 px, and even higher for full-resolution phone photos).
- `image_scale` is pinned to 256 (`hash_size=8, image_scale=256, mode="haar"`): provides a size-independent hash definition and reduces latency to $\approx 10\text{ ms}$. Measured on 30 synthetic 1600x1200 images vs 25% resized copies: mean distance 0.93 (default) vs 0.90 (256).
