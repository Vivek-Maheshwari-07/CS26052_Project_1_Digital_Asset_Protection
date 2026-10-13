"""Generate the scripted (classical) edits for an evaluation dataset.

You supply the originals (and the hand-made parts: platform round-trips, AI edits, hard
negatives); this adds a fixed battery of classical alterations of every original so those do not
have to be produced by hand.

    python -m eval.make_dataset --dataset DATASET_DIR [--per-original 12] [--edits crop_50,hflip,...] [--seed 7]

Reads    DATASET_DIR/originals/*            (and optionally DATASET_DIR/originals.csv: original_id,category,group)
Writes   DATASET_DIR/suspects/<id>__<edit>.<ext>
Appends  DATASET_DIR/manifest.csv rows with relation=classical

See docs/DATASET_SPEC.md for the full dataset layout.
"""
import argparse
import csv
import io
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MANIFEST_FIELDS = ["file", "original_id", "relation", "category", "edit", "tool", "platform", "notes"]


def _jpeg(img, quality, scale=1.0):
    img = img.convert("RGB")
    if scale != 1.0:
        img = img.resize((max(16, int(img.width * scale)), max(16, int(img.height * scale))), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality)
    return Image.open(io.BytesIO(buf.getvalue())).convert("RGB")


def _center_crop(img, area):
    w, h = img.size
    s = area ** 0.5
    cw, ch = max(16, int(w * s)), max(16, int(h * s))
    left, top = (w - cw) // 2, (h - ch) // 2
    return img.crop((left, top, left + cw, top + ch))


def _noise(img, sigma, rng):
    arr = np.asarray(img.convert("RGB"), dtype=np.float32)
    arr = arr + rng.normal(0, sigma, arr.shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def _text_overlay(img):
    img = img.convert("RGB").copy()
    d = ImageDraw.Draw(img)
    w, h = img.size
    for i in range(3):
        d.text((w * 0.06, h * (0.15 + i * 0.25)), "@reposted_by_someone  #art  #viral", fill=(255, 255, 255))
    return img


def _meme(img):
    img = img.convert("RGB").copy()
    w, h = img.size
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, int(h * 0.14)], fill=(255, 255, 255))
    d.rectangle([0, int(h * 0.86), w, h], fill=(255, 255, 255))
    d.text((w * 0.05, h * 0.04), "WHEN THE ARTIST FINDS OUT", fill=(0, 0, 0))
    d.text((w * 0.05, h * 0.90), "IT WAS POSTED WITHOUT CREDIT", fill=(0, 0, 0))
    return img


def _watermark(img):
    img = img.convert("RGBA")
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = img.size
    d.rectangle([w * 0.62, h * 0.88, w * 0.97, h * 0.97], fill=(0, 0, 0, 140))
    d.text((w * 0.64, h * 0.91), "(c) someone_else", fill=(255, 255, 255, 230))
    return Image.alpha_composite(img, layer).convert("RGB")


def _letterbox(img):
    w, h = img.size
    canvas = Image.new("RGB", (int(w * 1.4), int(h * 1.4)), (250, 250, 250))
    canvas.paste(img.convert("RGB"), (int(w * 0.2), int(h * 0.2)))
    return canvas


def _screenshot_frame(img):
    """The image shown inside a phone-style UI: status bar on top, toolbar below, dark margins."""
    img = img.convert("RGB")
    w, h = img.size
    bar = max(24, int(h * 0.06))
    canvas = Image.new("RGB", (w, h + 2 * bar), (22, 22, 24))
    canvas.paste(img, (0, bar))
    d = ImageDraw.Draw(canvas)
    d.text((10, bar // 3), "9:41", fill=(255, 255, 255))
    d.rectangle([w * 0.3, h + bar + bar * 0.3, w * 0.7, h + bar + bar * 0.7], outline=(200, 200, 200))
    return canvas


def _collage(img, rng):
    """The original at ~40% of a canvas, surrounded by unrelated content."""
    img = img.convert("RGB")
    cw, ch = int(img.width * 1.8), int(img.height * 1.6)
    canvas = Image.fromarray(rng.integers(40, 215, (ch // 24 + 1, cw // 24 + 1, 3), dtype=np.uint8)).resize((cw, ch))
    canvas = canvas.filter(ImageFilter.GaussianBlur(2))
    small = img.resize((int(img.width * 0.8), int(img.height * 0.8)))
    canvas.paste(small, (int(cw * 0.1), int(ch * 0.2)))
    return canvas


def _perspective(img, rng, amount=0.04):
    img = img.convert("RGB")
    w, h = img.size
    jitter = lambda: float(rng.uniform(-amount, amount))  # noqa: E731
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    dst = [(w * jitter(), h * jitter()), (w * (1 + jitter()), h * jitter()),
           (w * (1 + jitter()), h * (1 + jitter())), (w * jitter(), h * (1 + jitter()))]
    # PIL wants the coefficients that map output -> input
    A = []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    coeffs = np.linalg.solve(np.array(A, float), np.array([c for p in src for c in p], float))
    return img.transform((w, h), Image.PERSPECTIVE, coeffs.tolist(), Image.BICUBIC)


def _sepia(img):
    g = ImageOps.grayscale(img)
    return ImageOps.colorize(g, black=(40, 20, 10), white=(255, 240, 210), mid=(150, 110, 70)).convert("RGB")


def _gamma(img, g):
    arr = (np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0) ** g
    return Image.fromarray((arr * 255).astype(np.uint8))


def build_edits(rng):
    """name -> function(PIL image) -> PIL image."""
    return {
        "jpeg_q30": lambda im: _jpeg(im, 30),
        "jpeg_q10": lambda im: _jpeg(im, 10),
        "resize_50": lambda im: _jpeg(im, 92, 0.5),
        "resize_25": lambda im: _jpeg(im, 92, 0.25),
        "thumb_200": lambda im: im.convert("RGB").resize(
            (200, max(16, int(200 * im.height / im.width))) if im.width >= im.height else
            (max(16, int(200 * im.width / im.height)), 200), Image.LANCZOS),
        "crop_75": lambda im: _center_crop(im, 0.75),
        "crop_50": lambda im: _center_crop(im, 0.50),
        "crop_25": lambda im: _center_crop(im, 0.25),
        "crop_10": lambda im: _center_crop(im, 0.10),
        "crop_5": lambda im: _center_crop(im, 0.05),
        "crop_offset_30": lambda im: im.crop((int(im.width * 0.3), 0, im.width, int(im.height * 0.85))),
        "rotate_5": lambda im: im.convert("RGB").rotate(5, expand=True, fillcolor=(255, 255, 255)),
        "rotate_15": lambda im: im.convert("RGB").rotate(15, expand=True, fillcolor=(255, 255, 255)),
        "rotate_90": lambda im: im.convert("RGB").rotate(90, expand=True),
        "rotate_180": lambda im: im.convert("RGB").rotate(180),
        "hflip": lambda im: ImageOps.mirror(im.convert("RGB")),
        "vflip": lambda im: ImageOps.flip(im.convert("RGB")),
        "hflip_crop50": lambda im: ImageOps.mirror(_center_crop(im.convert("RGB"), 0.5)),
        "blur_2": lambda im: im.convert("RGB").filter(ImageFilter.GaussianBlur(2)),
        "blur_5": lambda im: im.convert("RGB").filter(ImageFilter.GaussianBlur(5)),
        "sharpen": lambda im: im.convert("RGB").filter(ImageFilter.UnsharpMask(3, 200, 2)),
        "brightness_+40": lambda im: ImageEnhance.Brightness(im.convert("RGB")).enhance(1.4),
        "contrast_1.6": lambda im: ImageEnhance.Contrast(im.convert("RGB")).enhance(1.6),
        "saturation_2": lambda im: ImageEnhance.Color(im.convert("RGB")).enhance(2.0),
        "gamma_0.6": lambda im: _gamma(im, 0.6),
        "grayscale": lambda im: ImageOps.grayscale(im).convert("RGB"),
        "sepia": lambda im: _sepia(im),
        "posterize_4": lambda im: ImageOps.posterize(im.convert("RGB"), 4),
        "noise_10": lambda im: _noise(im, 10, rng),
        "noise_25": lambda im: _noise(im, 25, rng),
        "text_overlay": _text_overlay,
        "meme_text": _meme,
        "watermark": _watermark,
        "letterbox": _letterbox,
        "screenshot_frame": _screenshot_frame,
        "collage_embed": lambda im: _collage(im, rng),
        "perspective_mild": lambda im: _perspective(im, rng),
        "combo_crop_color_jpeg": lambda im: _jpeg(ImageEnhance.Color(_center_crop(im.convert("RGB"), 0.3)).enhance(1.6), 40),
    }


def read_originals_csv(path):
    if not os.path.exists(path):
        return {}
    with open(path, newline="", encoding="utf-8") as f:
        return {r["original_id"]: r for r in csv.DictReader(f)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--edits", help="comma-separated subset of edit names (default: all)")
    ap.add_argument("--per-original", type=int, help="apply only N randomly chosen edits to each original")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--list", action="store_true", help="print the edit names and exit")
    args = ap.parse_args()

    rng = np.random.default_rng(args.seed)
    edits = build_edits(rng)
    if args.list:
        print("\n".join(edits))
        return
    if args.edits:
        wanted = [e.strip() for e in args.edits.split(",")]
        unknown = [e for e in wanted if e not in edits]
        if unknown:
            sys.exit(f"Unknown edits: {unknown}. Use --list.")
        edits = {k: edits[k] for k in wanted}

    root = args.dataset
    orig_dir, sus_dir = os.path.join(root, "originals"), os.path.join(root, "suspects")
    os.makedirs(sus_dir, exist_ok=True)
    meta = read_originals_csv(os.path.join(root, "originals.csv"))
    files = sorted(f for f in os.listdir(orig_dir) if os.path.splitext(f)[1].lower() in IMAGE_EXTS)
    if not files:
        sys.exit(f"No images in {orig_dir}")

    manifest = os.path.join(root, "manifest.csv")
    fresh = not os.path.exists(manifest)
    chooser = random.Random(args.seed)
    rows = []
    for f in files:
        oid = os.path.splitext(f)[0]
        with Image.open(os.path.join(orig_dir, f)) as im:
            base = ImageOps.exif_transpose(im).convert("RGB")
        names = list(edits)
        if args.per_original and args.per_original < len(names):
            names = chooser.sample(names, args.per_original)
        for name in names:
            out_name = f"{oid}__{name}.png"
            out_path = os.path.join(sus_dir, out_name)
            if not os.path.exists(out_path):
                edits[name](base).save(out_path)
            rows.append({"file": out_name, "original_id": oid, "relation": "classical",
                         "category": meta.get(oid, {}).get("category", ""), "edit": name,
                         "tool": "make_dataset.py", "platform": "", "notes": ""})
        print(f"  {oid}: {len(names)} edits", flush=True)

    existing = set()
    if not fresh:
        with open(manifest, newline="", encoding="utf-8") as fh:
            existing = {r["file"] for r in csv.DictReader(fh)}
    with open(manifest, "a", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=MANIFEST_FIELDS)
        if fresh:
            w.writeheader()
        w.writerows(r for r in rows if r["file"] not in existing)
    print(f"{len(rows)} classical suspects written to {sus_dir}; manifest: {manifest}")


if __name__ == "__main__":
    main()
