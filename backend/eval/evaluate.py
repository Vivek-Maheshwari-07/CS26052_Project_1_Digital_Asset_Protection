"""Robustness evaluation: classical perceptual hashing vs. the embedding model.

For every original image we apply a battery of edits (crops, filters,
compression, rotations, overlays, simulated "AI-style" re-renders), fingerprint
each edited copy and score it against *every* original:

  * the pair (edited copy, its own original)   -> positive
  * the pairs (edited copy, any other original) -> negatives

Reported per method (pHash, embedding, combined) and per edit:
  AUC, TPR at 1% FPR, top-1 retrieval accuracy, mean positive score,
plus the threshold that best separates positives from negatives.

Usage (from backend/):
    python -m eval.evaluate --download 40            # fetch 40 photos into eval/data/originals
    python -m eval.evaluate                           # run on eval/data/originals
    python -m eval.evaluate --reuse                   # recompute metrics from cached fingerprints
    python -m eval.evaluate --images path/to/dir --edited path/to/ai_edits

`--edited` takes real edited copies (e.g. made with an AI image editor). Name
each file `<original-stem>__<anything>.<ext>` so it is paired with its original.
"""
import argparse
import csv
import io
import json
import os
import random
import sys
import time
from datetime import datetime, timezone

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


from app.fingerprint.combine import fingerprint_sync  # noqa: E402
from app.registry.index import phash_bits  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ---------------------------------------------------------------- edits

def _jpeg(img, q):
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=q)
    return Image.open(io.BytesIO(buf.getvalue()))


def _center_crop(img, frac):
    w, h = img.size
    dw, dh = int(w * frac / 2), int(h * frac / 2)
    return img.crop((dw, dh, w - dw, h - dh))


def _offset_crop(img, frac):
    w, h = img.size
    return img.crop((int(w * frac), 0, w, int(h * (1 - frac / 2))))


def _noise(img, sigma, rng):
    arr = np.asarray(img.convert("RGB"), dtype=np.float32)
    arr += rng.normal(0, sigma, arr.shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def _overlay_text(img):
    img = img.convert("RGB").copy()
    d = ImageDraw.Draw(img)
    w, h = img.size
    for i in range(4):
        d.text((w * 0.08, h * (0.2 + i * 0.18)), "@reposted_by_someone  #art  #viral", fill=(255, 255, 255))
    d.rectangle([0, h * 0.86, w, h], fill=(0, 0, 0))
    return img


def _letterbox(img):
    w, h = img.size
    canvas = Image.new("RGB", (int(w * 1.4), int(h * 1.4)), (250, 250, 250))
    canvas.paste(img.convert("RGB"), (int(w * 0.2), int(h * 0.2)))
    return canvas.resize((w, h))


def _painterly(img):
    """Simulated AI re-render: smooth regions, posterise, re-sharpen edges."""
    small = img.convert("RGB").resize((img.width // 2, img.height // 2))
    small = small.filter(ImageFilter.ModeFilter(5)).filter(ImageFilter.SMOOTH_MORE)
    return ImageOps.posterize(small.resize(img.size), 4).filter(ImageFilter.EDGE_ENHANCE)


def _restyle(img):
    """Simulated style transfer: colour remap + texture."""
    g = ImageOps.grayscale(img)
    toned = ImageOps.colorize(g, black=(30, 10, 60), white=(255, 220, 160), mid=(200, 90, 120))
    return toned.filter(ImageFilter.DETAIL)


def build_edits(rng):
    return {
        "jpeg_q30": lambda im: _jpeg(im, 30),
        "jpeg_q10": lambda im: _jpeg(im, 10),
        "resize_25pct": lambda im: im.resize((max(32, im.width // 4), max(32, im.height // 4))),
        "crop_10": lambda im: _center_crop(im, 0.10),
        "crop_25": lambda im: _center_crop(im, 0.25),
        "crop_40": lambda im: _center_crop(im, 0.40),
        "crop_offset_30": lambda im: _offset_crop(im, 0.30),
        "rotate_5": lambda im: im.rotate(5, expand=True, fillcolor=(255, 255, 255)),
        "rotate_15": lambda im: im.rotate(15, expand=True, fillcolor=(255, 255, 255)),
        "hflip": ImageOps.mirror,
        "blur_r3": lambda im: im.filter(ImageFilter.GaussianBlur(3)),
        "brightness_+40": lambda im: ImageEnhance.Brightness(im).enhance(1.4),
        "contrast_x1.6": lambda im: ImageEnhance.Contrast(im).enhance(1.6),
        "saturation_x2": lambda im: ImageEnhance.Color(im).enhance(2.0),
        "grayscale": lambda im: ImageOps.grayscale(im).convert("RGB"),
        "noise_s20": lambda im: _noise(im, 20, rng),
        "text_overlay": _overlay_text,
        "letterbox": _letterbox,
        "combo_crop_filter_jpeg": lambda im: _jpeg(ImageEnhance.Color(_center_crop(im, 0.2)).enhance(1.5), 40),
        "sim_ai_painterly": _painterly,
        "sim_ai_restyle": _restyle,
    }


# ---------------------------------------------------------------- metrics

def auc(pos, neg):
    """Probability a random positive outscores a random negative (Mann-Whitney U)."""
    pos, neg = np.asarray(pos), np.asarray(neg)
    if len(pos) == 0 or len(neg) == 0:
        return float("nan")
    scores = np.concatenate([pos, neg])
    order = scores.argsort(kind="mergesort")
    ranks = np.empty(len(scores))
    ranks[order] = np.arange(1, len(scores) + 1)
    # average ranks for ties
    _, inv, counts = np.unique(scores, return_inverse=True, return_counts=True)
    sums = np.bincount(inv, weights=ranks)
    ranks = (sums / counts)[inv]
    return float((ranks[: len(pos)].sum() - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg)))


def tpr_at_fpr(pos, neg, fpr=0.01):
    thr = np.quantile(neg, 1 - fpr)
    return float((np.asarray(pos) > thr).mean()), float(thr)


def best_threshold(pos, neg):
    """Threshold maximising Youden's J (TPR - FPR)."""
    cands = np.unique(np.concatenate([pos, neg]))
    best = (-1, 0.5, 0, 0)
    for t in cands:
        tpr, fpr_ = (pos >= t).mean(), (neg >= t).mean()
        if tpr - fpr_ > best[0]:
            best = (tpr - fpr_, float(t), float(tpr), float(fpr_))
    return {"threshold": best[1], "tpr": best[2], "fpr": best[3]}


# ---------------------------------------------------------------- data

def load_images(folder, limit=None):
    files = sorted(f for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in IMAGE_EXTS)
    if limit:
        files = files[:limit]
    return [(os.path.splitext(f)[0], os.path.join(folder, f)) for f in files]


def download_originals(n, folder):
    """Fetch n photos from Lorem Picsum (Unsplash photos, free to use)."""
    import httpx
    os.makedirs(folder, exist_ok=True)
    ids = list(range(10, 1000))
    random.Random(7).shuffle(ids)
    got = 0
    with httpx.Client(timeout=30, follow_redirects=True) as client:
        for pid in ids:
            if got >= n:
                break
            path = os.path.join(folder, f"picsum_{pid}.jpg")
            if os.path.exists(path):
                got += 1
                continue
            try:
                r = client.get(f"https://picsum.photos/id/{pid}/800/600")
                if r.status_code == 200 and r.headers.get("content-type", "").startswith("image"):
                    open(path, "wb").write(r.content)
                    got += 1
                    print(f"  downloaded {got}/{n}", end="\r")
            except httpx.HTTPError:
                continue
    print(f"\n{got} originals in {folder}")


def to_bytes(img):
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "PNG")
    return buf.getvalue()



# ---------------------------------------------------------------- fusion calibration

def fit_logistic(X, y, balanced=True, l2=1e-3, iters=50):
    """Logistic regression via Newton's method (IRLS). X: (n, d) without bias column."""
    Xb = np.hstack([X, np.ones((len(X), 1))])
    w = np.zeros(Xb.shape[1])
    sw = np.ones(len(y))
    if balanced:
        sw[y == 1] = 0.5 / max(1, (y == 1).sum())
        sw[y == 0] = 0.5 / max(1, (y == 0).sum())
        sw *= len(y)
    for _ in range(iters):
        p = 1 / (1 + np.exp(-np.clip(Xb @ w, -50, 50)))
        g = Xb.T @ (sw * (p - y)) + l2 * w
        H = (Xb * (sw * p * (1 - p))[:, None]).T @ Xb + l2 * np.eye(len(w))
        step = np.linalg.solve(H, g)
        w -= step
        if np.abs(step).max() < 1e-8:
            break
    return w  # [w_phash, w_embedding, bias]


def predict(w, p, e):
    return 1 / (1 + np.exp(-np.clip(w[0] * p + w[1] * e + w[2], -50, 50)))


# ---------------------------------------------------------------- main

def fingerprint_all(args, originals, edits):
    """Fingerprint originals and every edited copy. Cached so reruns are instant."""
    cache = os.path.join(HERE, "data", "fingerprints.npz")
    key = "|".join(s for s, _ in originals) + "#" + "|".join(edits) + f"#{args.edited}#{args.seed}"
    if args.reuse and os.path.exists(cache):
        z = np.load(cache, allow_pickle=True)
        if str(z["key"]) == key:
            print("Using cached fingerprints")
            return z["E"], z["B"], list(z["q_name"]), z["q_true"], z["q_E"], z["q_B"], float(z["seconds"])

    t0 = time.time()
    E, B = [], []
    for i, (_, path) in enumerate(originals):
        with Image.open(path) as im:
            fp = fingerprint_sync(im.convert("RGB"))
        E.append(fp["embedding"])
        B.append(phash_bits(fp["phash"]))
        print(f"  fingerprinted originals {i + 1}/{len(originals)}", flush=True)

    q_name, q_true, q_E, q_B = [], [], [], []

    def add(name, i, img):
        fp = fingerprint_sync(img)
        q_name.append(name); q_true.append(i)
        q_E.append(fp["embedding"]); q_B.append(phash_bits(fp["phash"]))

    for i, (_, path) in enumerate(originals):
        with Image.open(path) as im:
            base = im.convert("RGB")
        for name, fn in edits.items():
            add(name, i, fn(base))
        print(f"  fingerprinted edits for original {i + 1}/{len(originals)}", flush=True)

    if args.edited and os.path.isdir(args.edited):
        stem_idx = {s: i for i, (s, _) in enumerate(originals)}
        for stem, path in load_images(args.edited):
            src = stem.split("__")[0]
            if src in stem_idx:
                with Image.open(path) as im:
                    add("real_edit", stem_idx[src], im.convert("RGB"))
        print(f"  + {q_name.count('real_edit')} real edited copies")

    seconds = time.time() - t0
    E, B = np.asarray(E, np.float32), np.asarray(B, np.uint8)
    q_true, q_E, q_B = np.asarray(q_true), np.asarray(q_E, np.float32), np.asarray(q_B, np.uint8)
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    np.savez_compressed(cache, key=key, E=E, B=B, q_name=np.asarray(q_name), q_true=q_true,
                        q_E=q_E, q_B=q_B, seconds=seconds)
    return E, B, q_name, q_true, q_E, q_B, seconds


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--images", default=os.path.join(HERE, "data", "originals"))
    ap.add_argument("--edited", help="folder of real edited copies named <original-stem>__*.ext")
    ap.add_argument("--out", default=os.path.join(HERE, "results"))
    ap.add_argument("--limit", type=int, help="use only the first N originals")
    ap.add_argument("--download", type=int, metavar="N", help="download N originals first")
    ap.add_argument("--reuse", action="store_true", help="reuse cached fingerprints from the last run")
    ap.add_argument("--folds", type=int, default=5, help="cross-validation folds (grouped by original)")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    if args.download:
        download_originals(args.download, args.images)
    if not os.path.isdir(args.images) or not load_images(args.images):
        sys.exit(f"No images in {args.images}. Add some or run with --download 40.")

    rng = np.random.default_rng(args.seed)
    edits = build_edits(rng)
    originals = load_images(args.images, args.limit)
    n = len(originals)
    print(f"{n} originals x {len(edits)} edits")

    E, B, q_name, q_true, q_E, q_B, fp_seconds = fingerprint_all(args, originals, edits)
    q_name = np.asarray(q_name)

    # Similarity of every query against every original: (n_queries, n_originals)
    S_emb = q_E @ E.T
    S_ph = 1.0 - (q_B[:, None, :] != B[None, :, :]).sum(axis=2) / B.shape[1]
    is_pos = np.zeros_like(S_emb, dtype=bool)
    is_pos[np.arange(len(q_true)), q_true] = True

    # Cross-validated logistic fusion, folds grouped by original image so that a
    # test query's original never appears in training (as positive or negative).
    fold_of = np.random.default_rng(args.seed).permutation(n) % args.folds
    S_cv = np.zeros_like(S_emb)
    for k in range(args.folds):
        tr_q = fold_of[q_true] != k
        tr_o = fold_of != k
        Xp = S_ph[np.ix_(tr_q, tr_o)].ravel()
        Xe = S_emb[np.ix_(tr_q, tr_o)].ravel()
        y = is_pos[np.ix_(tr_q, tr_o)].ravel().astype(float)
        w = fit_logistic(np.column_stack([Xp, Xe]), y)
        S_cv[~tr_q] = predict(w, S_ph[~tr_q], S_emb[~tr_q])
    w_all = fit_logistic(np.column_stack([S_ph.ravel(), S_emb.ravel()]), is_pos.ravel().astype(float))

    # Previous hand-tuned fusion, kept as a baseline for the paper
    boosted = np.minimum(1.0, S_emb * 1.25)
    S_old = np.maximum(boosted * 0.75 + S_ph * 0.25, S_emb)

    methods = {"phash": S_ph, "embedding": S_emb, "heuristic_fusion": S_old, "logistic_fusion_cv": S_cv}

    def metrics(S, rows_mask):
        Sm, P = S[rows_mask], is_pos[rows_mask]
        pos, neg = Sm[P], Sm[~P]
        tpr1, thr1 = tpr_at_fpr(pos, neg, 0.01)
        tpr01, _ = tpr_at_fpr(pos, neg, 0.001)
        top1 = (Sm.argmax(axis=1) == np.where(P)[1]) & ((Sm == Sm[P][:, None]).sum(axis=1) == 1)
        return {"auc": auc(pos, neg), "tpr_at_1pct_fpr": tpr1, "tpr_at_0.1pct_fpr": tpr01,
                "threshold_at_1pct_fpr": thr1, "top1": float(top1.mean()),
                "mean_pos": float(pos.mean()), "mean_neg": float(neg.mean()),
                "n_pos": int(len(pos)), "n_neg": int(len(neg))}

    all_rows = np.ones(len(q_true), dtype=bool)
    overall = {m: metrics(S, all_rows) for m, S in methods.items()}
    edit_names = list(dict.fromkeys(q_name))
    rows = [{"edit": e, "method": m, **metrics(S, q_name == e)} for e in edit_names for m, S in methods.items()]

    # Recommended thresholds on the CV probabilities
    neg_cv = S_cv[~is_pos]
    pos_cv = S_cv[is_pos]
    likely = float(max(0.5, np.quantile(neg_cv, 0.999)))
    possible = float(max(0.2, np.quantile(neg_cv, 0.99)))
    recommended = {
        "FUSION_W_EMBEDDING": round(float(w_all[1]), 3),
        "FUSION_W_PHASH": round(float(w_all[0]), 3),
        "FUSION_BIAS": round(float(w_all[2]), 3),
        "MATCH_LIKELY": round(likely, 3),
        "MATCH_POSSIBLE": round(possible, 3),
        "tpr_likely": float((pos_cv >= likely).mean()), "fpr_likely": float((neg_cv >= likely).mean()),
        "tpr_possible": float((pos_cv >= possible).mean()), "fpr_possible": float((neg_cv >= possible).mean()),
    }

    # ---- write outputs
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out = os.path.join(args.out, stamp)
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "per_edit.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(out, "summary.json"), "w") as f:
        json.dump({"originals": n, "edits": edit_names, "queries": int(len(q_true)),
                   "fingerprint_seconds": fp_seconds, "overall": overall, "recommended_settings": recommended},
                  f, indent=2)

    label = {"phash": "pHash", "embedding": "Embedding (CLIP)", "heuristic_fusion": "Old heuristic fusion",
             "logistic_fusion_cv": "Logistic fusion (5-fold CV)"}
    md = [f"# Robustness evaluation ({stamp})", "",
          f"{n} originals, {len(edit_names)} edit types, {len(q_true):,} edited copies, "
          f"{overall['embedding']['n_neg']:,} unrelated pairs (negatives).", "",
          "## Overall", "",
          "| Method | AUC | TPR @ 1% FPR | TPR @ 0.1% FPR | Top-1 retrieval | Mean score: copy / unrelated |",
          "|---|---|---|---|---|---|"]
    for m in methods:
        o = overall[m]
        md.append(f"| {label[m]} | {o['auc']:.4f} | {o['tpr_at_1pct_fpr']:.1%} | {o['tpr_at_0.1pct_fpr']:.1%} | "
                  f"{o['top1']:.1%} | {o['mean_pos']:.3f} / {o['mean_neg']:.3f} |")
    md += ["", "## Recommended settings (backend/.env)", "", "```"]
    md += [f"{k}={recommended[k]}" for k in ("FUSION_W_EMBEDDING", "FUSION_W_PHASH", "FUSION_BIAS", "MATCH_LIKELY", "MATCH_POSSIBLE")]
    md += ["```", "",
           f"Likely-match threshold: catches {recommended['tpr_likely']:.1%} of edited copies, "
           f"flags {recommended['fpr_likely']:.2%} of unrelated pairs.  ",
           f"Possible-match threshold: catches {recommended['tpr_possible']:.1%}, "
           f"flags {recommended['fpr_possible']:.2%}.", "",
           "## Detection rate per edit (TPR @ 1% FPR)", "",
           "| Edit | pHash | Embedding | Old fusion | Logistic fusion |", "|---|---|---|---|---|"]
    for e in edit_names:
        r = {x["method"]: x for x in rows if x["edit"] == e}
        md.append(f"| {e} | " + " | ".join(f"{r[m]['tpr_at_1pct_fpr']:.1%}" for m in methods) + " |")
    md += ["", "## AUC per edit", "", "| Edit | pHash | Embedding | Old fusion | Logistic fusion |", "|---|---|---|---|---|"]
    for e in edit_names:
        r = {x["method"]: x for x in rows if x["edit"] == e}
        md.append(f"| {e} | " + " | ".join(f"{r[m]['auc']:.3f}" for m in methods) + " |")
    md += ["", "Notes: negatives are pairs of *different* photos, so they're easier than real look-alikes "
               "(e.g. two photos of the same landmark). Edits prefixed `sim_ai_` are simulated re-renders, "
               "not generative-model output; add real AI-edited copies with `--edited`."]
    with open(os.path.join(out, "summary.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        colors = {"phash": "#94a3b8", "embedding": "#5b4cf0", "heuristic_fusion": "#f59e0b", "logistic_fusion_cv": "#d83fb4"}
        x = np.arange(len(edit_names))
        fig, ax = plt.subplots(figsize=(max(11, len(edit_names) * 0.62), 5))
        width = 0.2
        for k, m in enumerate(methods):
            vals = [next(r["tpr_at_1pct_fpr"] for r in rows if r["edit"] == e and r["method"] == m) for e in edit_names]
            ax.bar(x + (k - 1.5) * width, vals, width, label=label[m], color=colors[m])
        ax.set_xticks(x, edit_names, rotation=55, ha="right")
        ax.set_ylabel("TPR at 1% FPR")
        ax.set_ylim(0, 1.05)
        ax.set_title("Detection rate per edit (higher is better)")
        ax.legend(fontsize=8, ncol=4, loc="lower left")
        ax.spines[["top", "right"]].set_visible(False)
        fig.tight_layout()
        fig.savefig(os.path.join(out, "tpr_per_edit.png"), dpi=160)

        fig, axes = plt.subplots(1, 2, figsize=(11, 4.2))
        for ax, m in zip(axes, ("phash", "embedding")):
            S = methods[m]
            bins = np.linspace(min(S.min(), 0), 1, 60)
            ax.hist(S[~is_pos], bins, density=True, alpha=.45, color="#94a3b8", label="unrelated image")
            ax.hist(S[is_pos], bins, density=True, alpha=.75, color=colors[m], label="edited copy")
            ax.set_title(label[m])
            ax.set_xlabel("similarity")
            ax.legend(fontsize=8)
            ax.spines[["top", "right"]].set_visible(False)
        fig.tight_layout()
        fig.savefig(os.path.join(out, "score_distributions.png"), dpi=160)
    except ImportError:
        print("matplotlib not installed: skipping charts")

    print("\n".join(md[:22]))
    print(f"\nResults written to {out}")


if __name__ == "__main__":
    main()
