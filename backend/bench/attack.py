"""
ProvNet Attack & Query Generation Engine.
Transforms original and hard negative images across 12 deterministic attack categories.
Outputs query PNG images and queries.csv manifest.
"""

import argparse
import hashlib
import io
import sys
from collections.abc import Callable
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

# =============================================================================
# Transform Implementations
# =============================================================================

def apply_jpeg(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    q_map = {"weak": 75, "medium": 50, "strong": 25}
    quality = q_map.get(strength, 50)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    out = Image.open(buf)
    out.load()
    return out


def apply_resize(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    scale_map = {"weak": 0.75, "medium": 0.50, "strong": 0.25}
    scale = scale_map.get(strength, 0.50)
    w, h = img.size
    new_w = max(64, round(w * scale))
    new_h = max(64, round(h * scale))
    return img.resize((new_w, new_h), Image.Resampling.BICUBIC)


def apply_crop_center(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    frac_map = {"weak": 0.90, "medium": 0.75, "strong": 0.50}
    frac = frac_map.get(strength, 0.75)
    w, h = img.size
    crop_w = max(64, round(w * frac))
    crop_h = max(64, round(h * frac))
    left = (w - crop_w) // 2
    top = (h - crop_h) // 2
    return img.crop((left, top, left + crop_w, top + crop_h))


def apply_rotate(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    deg_map = {"weak": 5, "medium": 15, "strong": 30}
    deg = deg_map.get(strength, 15)
    # Expand canvas and fill background with grey (128, 128, 128)
    return img.rotate(deg, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(128, 128, 128))


def apply_hflip(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    return img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)


def apply_gaussian_blur(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    r_map = {"weak": 1, "medium": 2, "strong": 4}
    radius = r_map.get(strength, 2)
    return img.filter(ImageFilter.GaussianBlur(radius=radius))


def apply_gaussian_noise(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    sigma_map = {"weak": 5.0, "medium": 15.0, "strong": 30.0}
    sigma = sigma_map.get(strength, 15.0)
    arr = np.asarray(img.convert("RGB"), dtype=np.float32)
    noise = rng.normal(0.0, sigma, size=arr.shape).astype(np.float32)
    noisy_arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(noisy_arr, mode="RGB")


def apply_brightness(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    factor_map = {"weak": 1.2, "medium": 1.5, "strong": 0.5}
    factor = factor_map.get(strength, 1.2)
    enhancer = ImageEnhance.Brightness(img.convert("RGB"))
    return enhancer.enhance(factor)


def apply_contrast(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    factor_map = {"weak": 1.3, "medium": 1.6, "strong": 0.6}
    factor = factor_map.get(strength, 1.3)
    enhancer = ImageEnhance.Contrast(img.convert("RGB"))
    return enhancer.enhance(factor)


def apply_color_jitter(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    # Jitter hue and saturation in HSV color space
    hsv = img.convert("HSV")
    h_arr, s_arr, v_arr = hsv.split()
    h = np.asarray(h_arr, dtype=np.float32)
    s = np.asarray(s_arr, dtype=np.float32)

    shift_map = {
        "weak": (12.0, 1.2),     # ~5% hue shift, +20% sat
        "medium": (38.0, 1.5),   # ~15% hue shift, +50% sat
        "strong": (76.0, 0.5),   # ~30% hue shift, -50% sat
    }
    h_shift, s_scale = shift_map.get(strength, (38.0, 1.5))
    h_new = np.mod(h + h_shift, 256.0).astype(np.uint8)
    s_new = np.clip(s * s_scale, 0, 255.0).astype(np.uint8)

    hsv_new = Image.merge("HSV", (
        Image.fromarray(h_new, mode="L"),
        Image.fromarray(s_new, mode="L"),
        v_arr
    ))
    return hsv_new.convert("RGB")


def apply_text_overlay(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    out = img.convert("RGB").copy()
    draw = ImageDraw.Draw(out)
    w, h = out.size

    # Font size relative to image width: 4% (weak), 8% (medium), 14% (strong)
    size_frac_map = {"weak": 0.04, "medium": 0.08, "strong": 0.14}
    size_frac = size_frac_map.get(strength, 0.08)
    font_size = max(10, round(w * size_frac))
    stroke_width = max(1, font_size // 10)

    try:
        font = ImageFont.load_default(size=font_size)
    except Exception:  # noqa: BLE001
        font = ImageFont.load_default()

    text = "PROVNET CERTIFIED ASSET"
    # Centred horizontally at 85% height, white text with black outline
    pos_x = w // 2
    pos_y = round(h * 0.85)

    draw.text(
        (pos_x, pos_y),
        text,
        fill=(255, 255, 255),
        font=font,
        anchor="mm",
        stroke_width=stroke_width,
        stroke_fill=(0, 0, 0),
    )
    return out


def apply_screenshot_pad(img: Image.Image, strength: str, rng: np.random.Generator) -> Image.Image:
    pad_map = {"weak": 0.05, "medium": 0.15, "strong": 0.30}
    pad_frac = pad_map.get(strength, 0.15)
    w, h = img.size
    pad_w = round(w * pad_frac)
    pad_h = round(h * pad_frac)
    new_w = w + 2 * pad_w
    new_h = h + 2 * pad_h

    canvas = Image.new("RGB", (new_w, new_h), (255, 255, 255))
    canvas.paste(img.convert("RGB"), (pad_w, pad_h))
    return canvas


# =============================================================================
# Transform Registry
# =============================================================================

TransformFunc = Callable[[Image.Image, str, np.random.Generator], Image.Image]

TRANSFORMS: dict[str, tuple[TransformFunc, list[str]]] = {
    "jpeg": (apply_jpeg, ["weak", "medium", "strong"]),
    "resize": (apply_resize, ["weak", "medium", "strong"]),
    "crop_center": (apply_crop_center, ["weak", "medium", "strong"]),
    "rotate": (apply_rotate, ["weak", "medium", "strong"]),
    "hflip": (apply_hflip, ["1"]),
    "gaussian_blur": (apply_gaussian_blur, ["weak", "medium", "strong"]),
    "gaussian_noise": (apply_gaussian_noise, ["weak", "medium", "strong"]),
    "brightness": (apply_brightness, ["weak", "medium", "strong"]),
    "contrast": (apply_contrast, ["weak", "medium", "strong"]),
    "color_jitter": (apply_color_jitter, ["weak", "medium", "strong"]),
    "text_overlay": (apply_text_overlay, ["weak", "medium", "strong"]),
    "screenshot_pad": (apply_screenshot_pad, ["weak", "medium", "strong"]),
}


def get_deterministic_rng(source_id: str, transform: str, strength: str) -> np.random.Generator:
    """Generate deterministic NumPy RNG seeded from (source_id, transform, strength)."""
    key = f"{source_id}_{transform}_{strength}".encode()
    seed = int(hashlib.sha256(key).hexdigest()[:8], 16)
    return np.random.default_rng(seed)


def generate_queries(
    data_dir: Path,
    limit: int | None = None,
    overwrite: bool = False,
) -> pd.DataFrame:
    """Generate all transformed query images and metadata manifest."""
    manifest_path = data_dir / "manifest.csv"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Missing {manifest_path}. Run make_manifest first.")

    manifest_df = pd.read_csv(manifest_path)
    if limit is not None and limit > 0:
        manifest_df = manifest_df.head(limit)

    queries_dir = data_dir / "queries"
    queries_dir.mkdir(parents=True, exist_ok=True)

    orig_dir = data_dir / "originals"
    neg_dir = data_dir / "hard_negatives"

    records = []

    # Process pairs from manifest
    for _, row in manifest_df.iterrows():
        orig_id = str(row["original_id"])
        neg_id = str(row["neg_id"])
        split = row["split"]

        sources = [
            (orig_id, "original", orig_id, True, orig_dir),
            (neg_id, "hard_negative", orig_id, False, neg_dir),
        ]

        for source_id, source_kind, paired_orig_id, is_true_copy, source_folder in sources:
            # Locate image file
            src_files = list(source_folder.glob(f"{source_id}.*"))
            if not src_files:
                print(f"Warning: image file for {source_id} not found in {source_folder}", file=sys.stderr)
                continue
            src_path = src_files[0]

            with Image.open(src_path) as src_img:
                src_img = src_img.convert("RGB")

                # 1. Untransformed query
                untrans_fname = f"{source_id}__none__none.png"
                untrans_path = queries_dir / untrans_fname
                if overwrite or not untrans_path.exists():
                    src_img.save(untrans_path, format="PNG")

                records.append({
                    "query_file": untrans_fname,
                    "source_id": source_id,
                    "source_kind": source_kind,
                    "original_id": paired_orig_id,
                    "transform": "none",
                    "strength": "none",
                    "split": split,
                    "is_true_copy": is_true_copy,
                })

                # 2. All 12 transforms x strengths
                for transform_name, (func, strengths) in TRANSFORMS.items():
                    for strength in strengths:
                        q_fname = f"{source_id}__{transform_name}__{strength}.png"
                        q_path = queries_dir / q_fname

                        if overwrite or not q_path.exists():
                            rng = get_deterministic_rng(source_id, transform_name, strength)
                            trans_img = func(src_img, strength, rng)
                            trans_img.save(q_path, format="PNG")

                        records.append({
                            "query_file": q_fname,
                            "source_id": source_id,
                            "source_kind": source_kind,
                            "original_id": paired_orig_id,
                            "transform": transform_name,
                            "strength": strength,
                            "split": split,
                            "is_true_copy": is_true_copy,
                        })

    queries_df = pd.DataFrame(records)
    out_csv = data_dir / "queries.csv"
    queries_df.to_csv(out_csv, index=False)
    print(f"Generated {len(queries_df)} queries -> {out_csv}")
    return queries_df


def main():
    parser = argparse.ArgumentParser(description="Generate attack query images for benchmarking")
    parser.add_argument(
        "--data-dir",
        type=str,
        default=None,
        help="Path to benchmark data directory (default: resolves to data/benchmark)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of manifest pairs to process (for rapid testing)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing query image files",
    )

    args = parser.parse_args()

    if args.data_dir:
        data_dir = Path(args.data_dir)
    else:
        repo_root = Path(__file__).resolve().parent.parent.parent
        data_dir = repo_root / "data" / "benchmark"

    try:
        generate_queries(data_dir=data_dir, limit=args.limit, overwrite=args.overwrite)
    except Exception as e:  # noqa: BLE001
        print(f"Error generating queries: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
