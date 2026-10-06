# ProvNet Architecture and Design Notes

## Classical Perceptual Hashing & Low-Detail Classification
- `grey_std` is computed as the standard deviation (0–255 scale) of greyscale image `g`, downscaled with `Image.Resampling.BOX` so the longest side is $\le$ 1024 to bound memory consumption for high-resolution (up to 40 MP) inputs while preserving variance statistics; images already $\le$ 1024 px are analyzed as-is.
