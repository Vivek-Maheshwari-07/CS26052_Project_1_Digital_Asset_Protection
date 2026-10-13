"""Category 2 of the evaluation dataset: exactly 12 scripted alterations of every original.

    python -m eval.make_classical_set --dataset ../dataset [--workers 3] [--big-mp 20]

Reads    <dataset>/originals/orig_<ID>__<CATEGORY>__<SOURCE>.<ext>
Writes   <dataset>/classical/orig_<ID>__classical_edit__<EDIT>.<ext>
         <dataset>/classical_manifest.csv   (rows in the gate_eval manifest format, relation=classical)

The same 12 edits are applied to every original, so results can be compared across image categories:

    crop_50  crop_30  crop_10        centre crops keeping 50% / 30% / 10% of the area
    rotate_90  rotate_180            lossless turns
    jpeg_q10  jpeg_q30               heavy JPEG recompression (always .jpg; alpha flattened on white)
    blur_gaussian                    Gaussian blur, sigma = 0.4% of the long side (2..12 px)
    grayscale                        luminance only, alpha kept
    screenshot_frame                 the image inside a phone-style UI (status bar + navigation bar)
    hflip                            mirrored repost
    resize_50                        half size

Conventions: EXIF orientation is applied first (edits are made on the image as displayed) and the
ICC profile is carried over. The output format follows the original: JPEG originals -> JPEG q95
(4:4:4); PNG originals -> lossless PNG with alpha preserved. Existing outputs are skipped, so the
script is safe to re-run (for example after adding a missing original).
"""
import argparse
import csv
import os
import re
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

EDITS = ["crop_50", "crop_30", "crop_10", "rotate_90", "rotate_180", "jpeg_q10", "jpeg_q30",
         "blur_gaussian", "grayscale", "screenshot_frame", "hflip", "resize_50"]
NAME_RE = re.compile(r"^orig_(?P<id>.+?)__(?P<cat>.+?)__(?P<src>.+)\.(?P<ext>[A-Za-z0-9]+)$")
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MANIFEST_FIELDS = ["file", "original_id", "relation", "category", "edit", "tool", "platform", "notes"]
Image.MAX_IMAGE_PIXELS = None  # we own these files; some originals exceed Pillow's safety limit


# ----------------------------------------------------------------------------- loading

def load_original(path):
    """(image as displayed in RGB or RGBA, source format, icc profile)."""
    with Image.open(path) as im:
        fmt, icc = im.format, im.info.get("icc_profile")
        im.load()
        if im.mode == "P":
            im = im.convert("RGBA" if "transparency" in im.info else "RGB")
        elif im.mode in ("LA", "PA"):
            im = im.convert("RGBA")
        elif im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")
        img = ImageOps.exif_transpose(im)  # no-op (returns a copy) without an orientation tag
        img = img.copy() if img is im else img
    if img.mode == "RGBA" and img.getchannel("A").getextrema()[0] == 255:
        img = img.convert("RGB")  # an alpha channel that is fully opaque carries nothing
    return img, fmt, icc


def is_visually_gray(img):
    thumb = np.asarray(img.convert("RGB").resize((64, 64)), dtype=np.int16)
    return float((np.abs(thumb[..., 0] - thumb[..., 1]) + np.abs(thumb[..., 1] - thumb[..., 2])).mean()) < 2.0


# ----------------------------------------------------------------------------- edits

def flatten(img, bg=(255, 255, 255)):
    if img.mode != "RGBA":
        return img.convert("RGB")
    canvas = Image.new("RGB", img.size, bg)
    canvas.paste(img, mask=img.getchannel("A"))
    return canvas


def centre_crop(img, area):
    w, h = img.size
    s = area ** 0.5
    cw, ch = max(1, round(w * s)), max(1, round(h * s))
    left, top = (w - cw) // 2, (h - ch) // 2
    return img.crop((left, top, left + cw, top + ch))


def blur(img):
    sigma = min(12.0, max(2.0, 0.004 * max(img.size)))
    if img.mode != "RGBA":
        return img.filter(ImageFilter.GaussianBlur(sigma))
    # blur colour weighted by alpha so transparent pixels don't bleed their (arbitrary) colour in
    a = img.getchannel("A")
    ab = a.filter(ImageFilter.GaussianBlur(sigma))
    chans = []
    for c in img.convert("RGB").split():
        pm = ImageChops.multiply(c, a).filter(ImageFilter.GaussianBlur(sigma))
        out = np.where(np.asarray(ab) > 0, np.asarray(pm, np.float32) * 255.0 / np.maximum(np.asarray(ab), 1), 0)
        chans.append(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)))
    return Image.merge("RGBA", (*chans, ab))


def grayscale(img):
    g = ImageOps.grayscale(img.convert("RGB")).convert("RGB")
    if img.mode == "RGBA":
        g.putalpha(img.getchannel("A"))
    return g


def screenshot_frame(img):
    """The image inside a phone-style UI: dark status bar (clock, signal, battery) and navigation bar."""
    img = flatten(img, (235, 235, 235))  # a screenshot shows transparency over a gallery background
    w, h = img.size
    u = max(20, int(0.05 * min(w, h)))
    top, bottom = int(1.3 * u), int(1.7 * u)
    ink, bg = (240, 240, 240), (18, 18, 20)
    canvas = Image.new("RGB", (w, h + top + bottom), bg)
    canvas.paste(img, (0, top))
    d = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.load_default(size=max(10, int(0.8 * u)))
    except TypeError:  # very old Pillow
        font = ImageFont.load_default()
    d.text((int(0.7 * u), int(0.25 * u)), "9:41", fill=ink, font=font)
    x0 = w - int(0.7 * u)
    d.rectangle([x0 - int(1.5 * u), int(0.4 * u), x0, int(0.9 * u)], outline=ink, width=max(1, u // 12))   # battery
    d.rectangle([x0 - int(1.4 * u), int(0.47 * u), x0 - int(0.5 * u), int(0.83 * u)], fill=ink)
    for i in range(4):                                                                                       # signal bars
        bx = x0 - int(3.3 * u) + i * int(0.32 * u)
        d.rectangle([bx, int(0.9 * u) - int((i + 1) * 0.14 * u), bx + int(0.22 * u), int(0.9 * u)], fill=ink)
    cy, cx = h + top + bottom // 2, w // 2
    r = int(0.38 * u)
    d.polygon([(cx - 3 * u, cy), (cx - 3 * u + r * 2, cy - r), (cx - 3 * u + r * 2, cy + r)], fill=ink)      # back
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ink, width=max(1, u // 10))                          # home
    d.rectangle([cx + 3 * u - r, cy - r, cx + 3 * u + r, cy + r], outline=ink, width=max(1, u // 10))       # recents
    return canvas


def apply_edit(name, img):
    if name.startswith("crop_"):
        return centre_crop(img, int(name.split("_")[1]) / 100.0)
    return {
        "rotate_90": lambda: img.transpose(Image.Transpose.ROTATE_90),
        "rotate_180": lambda: img.transpose(Image.Transpose.ROTATE_180),
        "jpeg_q10": lambda: img, "jpeg_q30": lambda: img,  # the compression happens when saving
        "blur_gaussian": lambda: blur(img),
        "grayscale": lambda: grayscale(img),
        "screenshot_frame": lambda: screenshot_frame(img),
        "hflip": lambda: ImageOps.mirror(img),
        "resize_50": lambda: img.resize((max(1, img.width // 2), max(1, img.height // 2)), Image.LANCZOS),
    }[name]()


def output_ext(name, source_format):
    if name.startswith("jpeg_"):
        return "jpg"
    return "jpg" if source_format == "JPEG" else "png"


def save(img, path, name, ext, icc):
    tmp = path + ".part"
    extra = {"icc_profile": icc} if icc else {}
    if ext == "jpg":
        flat = flatten(img)
        if name.startswith("jpeg_"):
            flat.save(tmp, "JPEG", quality=int(name.split("q")[1]), **extra)
        else:
            flat.save(tmp, "JPEG", quality=95, subsampling=0, **extra)
    else:
        img.save(tmp, "PNG", compress_level=3, **extra)
    os.replace(tmp, path)


# ----------------------------------------------------------------------------- driver

def process_one(src_path, out_dir):
    """All 12 edits of one original. Returns one result dict per edit; never raises."""
    fname = os.path.basename(src_path)
    m = NAME_RE.match(fname)
    results = []
    try:
        img, fmt, icc = load_original(src_path)
    except Exception as e:
        return [{"original": fname, "edit": ed, "file": "", "status": f"error: could not open original ({type(e).__name__}: {e})"}
                for ed in EDITS]
    gray_src = is_visually_gray(img)
    for name in EDITS:
        ext = output_ext(name, fmt)
        out_name = f"orig_{m['id']}__classical_edit__{name}.{ext}"
        out_path = os.path.join(out_dir, out_name)
        res = {"original": fname, "edit": name, "file": out_name, "status": "ok", "notes": []}
        try:
            if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
                res["status"] = "skipped (exists)"
            else:
                edited = apply_edit(name, img)
                res["size"] = edited.size
                save(edited, out_path, name, ext, icc)
                del edited
            if name == "grayscale" and gray_src:
                res["notes"].append("source is already grayscale (this edit is a near no-op)")
        except Exception as e:  # report and carry on: one bad edit must not stop the run
            res["status"] = f"error: {type(e).__name__}: {e}"
            if os.path.exists(out_path + ".part"):
                os.remove(out_path + ".part")
        results.append(res)
    return results


def megapixels(path):
    try:
        with Image.open(path) as im:
            return im.size[0] * im.size[1] / 1e6
    except Exception:
        return 0.0


def write_manifest(dataset, originals, out_dir):
    path = os.path.join(dataset, "classical_manifest.csv")
    rows = []
    for fname in originals:
        m = NAME_RE.match(fname)
        stem = os.path.splitext(fname)[0]
        fmt = _format_of(os.path.join(dataset, "originals", fname))
        for name in EDITS:
            ext = output_ext(name, fmt)
            out_name = f"orig_{m['id']}__classical_edit__{name}.{ext}"
            if os.path.exists(os.path.join(out_dir, out_name)):
                rows.append({"file": out_name, "original_id": stem, "relation": "classical", "category": m["cat"],
                             "edit": name, "tool": "make_classical_set.py", "platform": "", "notes": ""})
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=MANIFEST_FIELDS)
        w.writeheader()
        w.writerows(rows)
    return path, len(rows)


def _format_of(path):
    with Image.open(path) as im:
        return im.format


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--workers", type=int, default=3, help="parallel workers for normal-size originals")
    ap.add_argument("--big-mp", type=float, default=20.0,
                    help="originals above this many megapixels are processed one at a time (memory)")
    args = ap.parse_args()

    src_dir = os.path.join(args.dataset, "originals")
    out_dir = os.path.join(args.dataset, "classical")
    os.makedirs(out_dir, exist_ok=True)
    originals = sorted(f for f in os.listdir(src_dir) if os.path.splitext(f)[1].lower() in IMAGE_EXTS)
    unnamed = [f for f in originals if not NAME_RE.match(f)]
    if unnamed:
        sys.exit(f"These originals do not follow orig_<ID>__<CATEGORY>__<SOURCE>.<ext>: {unnamed[:5]}")
    ids = [NAME_RE.match(f)["id"] for f in originals]
    if len(set(ids)) != len(ids):
        sys.exit("Duplicate IDs among the originals.")

    sizes = {f: megapixels(os.path.join(src_dir, f)) for f in originals}
    big = [f for f in originals if sizes[f] > args.big_mp]
    normal = [f for f in originals if f not in big]
    print(f"{len(originals)} originals ({len(big)} above {args.big_mp:g} MP, processed one at a time) x {len(EDITS)} edits "
          f"= {len(originals) * len(EDITS)} files", flush=True)

    t0 = time.time()
    all_results, done = [], 0

    def report(res, fname):
        nonlocal done
        all_results.extend(res)
        done += 1
        bad = [r for r in res if r["status"].startswith("error")]
        print(f"  [{done}/{len(originals)}] {fname}  ({sum(r['status'] == 'ok' for r in res)} written, "
              f"{sum(r['status'].startswith('skipped') for r in res)} skipped, {len(bad)} errors)  "
              f"{(time.time() - t0) / 60:.1f} min", flush=True)
        for r in bad:
            print(f"      ERROR {r['edit']}: {r['status']}", flush=True)

    if normal:
        with ProcessPoolExecutor(max_workers=max(1, args.workers)) as pool:
            futs = {pool.submit(process_one, os.path.join(src_dir, f), out_dir): f for f in normal}
            for fut in as_completed(futs):
                report(fut.result(), futs[fut])
    for f in big:  # sequential: a 100-200 MP image needs gigabytes of RAM
        report(process_one(os.path.join(src_dir, f), out_dir), f)

    manifest, n_rows = write_manifest(args.dataset, originals, out_dir)
    produced = len([f for f in os.listdir(out_dir) if not f.endswith(".part")])
    errors = [r for r in all_results if r["status"].startswith("error")]
    tiny = [r for r in all_results if r.get("size") and min(r["size"]) < 64]
    notes = [(r["original"], n) for r in all_results for n in r.get("notes", [])]
    print(f"\n{produced} files in {out_dir} (expected {len(originals) * len(EDITS)}); manifest rows: {n_rows} -> {manifest}")
    print(f"errors: {len(errors)}; outputs with a side under 64 px: {len(tiny)}; notes: {len(notes)}; {(time.time() - t0) / 60:.1f} min")
    if tiny:
        print("  tiny outputs (e.g. crop_10 of a small sprite):", sorted({(r['original'][:12], r['edit']) for r in tiny})[:12])
    for o, n in notes[:10]:
        print(f"  note: {o}: {n}")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
