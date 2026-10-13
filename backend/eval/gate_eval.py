"""End-to-end evaluation of the gate pipeline against the classic fingerprint baseline.

    python -m eval.gate_eval --dataset DATASET_DIR [--out DIR] [--limit N] [--resume] [--sweep]
    python -m eval.gate_eval --analyze-only OUT_DIR [--sweep]      # recompute tables from a finished run

DATASET_DIR layout (see docs/DATASET_SPEC.md):
    originals/<id>.<ext>      registered works (positives are measured against these)
    distractors/<id>.<ext>    extra registered works that nothing should match (registry scale / noise)
    suspects/<file>           every image that gets checked
    manifest.csv              file, original_id, relation, category, edit, tool, platform, notes [, split]
    originals.csv (optional)  original_id, category, group   (group = creator; used to keep CV folds honest)

relation: copy | classical | platform | ai_light | ai_medium | ai_heavy | sibling | same_template |
          hard_negative | unrelated

Writes to OUT_DIR: runs.jsonl (one line per suspect, includes every candidate's metrics),
per_candidate.csv, failures.csv, summary.md, summary.json, sweep.md (with --sweep).
Nothing here touches the real database or backend/uploads.
"""
import argparse
import asyncio
import csv
import json
import os
import random
import statistics
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
POSITIVE = {"copy", "classical", "platform"}          # should be pixel evidence (Tier 1)
AI_EDIT = {"ai_light", "ai_medium"}                    # should at least be a lead, evidence is a bonus
AI_HEAVY = {"ai_heavy"}                                # honest limit: nothing expected
HARD_NEG = {"sibling", "same_template", "hard_negative"}  # related-but-different: lead ok, evidence is a false claim
UNRELATED = {"unrelated"}
NEGATIVE = HARD_NEG | UNRELATED
EVIDENCE = {"TIER1", "TIER2"}
LEAD = {"RELATED_DIFFERENT_CAPTURE", "TIER3"}


# ----------------------------------------------------------------------------- helpers

def cp_upper(k: int, n: int, alpha: float = 0.05) -> float:
    """One-sided Clopper-Pearson upper confidence bound for a proportion k/n (95% by default)."""
    if n == 0:
        return float("nan")
    if k >= n:
        return 1.0
    from scipy.stats import beta
    return float(beta.ppf(1 - alpha, k + 1, n - k))


def pct(k, n):
    return f"{100 * k / n:.1f}%" if n else "-"


def list_images(folder):
    if not os.path.isdir(folder):
        return []
    return sorted(f for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in IMAGE_EXTS)


def suspect_path(root, file):
    """`file` may be relative to the dataset root (folder-per-category layouts) or to suspects/."""
    direct = os.path.join(root, file)
    return direct if os.path.isfile(direct) else os.path.join(root, "suspects", file)


def registry_exclusions(root):
    path = os.path.join(root, "registry_exclude.txt")
    if not os.path.exists(path):
        return set()
    with open(path, encoding="utf-8") as f:
        return {line.strip() for line in f if line.strip() and not line.startswith("#")}


def load_manifest(root):
    path = os.path.join(root, "manifest.csv")
    if not os.path.exists(path):
        sys.exit(f"{path} not found")
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = [{k: (v or "").strip() for k, v in r.items()} for r in csv.DictReader(f)]
    problems = []
    valid = POSITIVE | AI_EDIT | AI_HEAVY | NEGATIVE
    for r in rows:
        if r.get("relation") not in valid:
            problems.append(f"{r.get('file')}: unknown relation {r.get('relation')!r}")
        if not os.path.isfile(suspect_path(root, r.get("file", ""))):
            problems.append(f"{r.get('file')}: file not found")
        if r.get("relation") in POSITIVE | AI_EDIT | AI_HEAVY | {"sibling"} and not r.get("original_id"):
            problems.append(f"{r.get('file')}: relation {r.get('relation')} needs original_id")
    if problems:
        print(f"{len(problems)} manifest problems (first 10):\n  " + "\n  ".join(problems[:10]))
        sys.exit("Fix the manifest first.")
    return rows


def validate_dataset(root):
    """Check the layout and print what the dataset covers, so gaps show up before a long run."""
    rows = load_manifest(root)  # exits with the problem list on error
    originals = list_images(os.path.join(root, "originals"))
    distractors = list_images(os.path.join(root, "distractors"))
    known = {os.path.splitext(f)[0] for f in originals}
    bad = [r["file"] for r in rows if r["original_id"] and r["original_id"] not in known]
    print(f"{len(originals)} originals, {len(distractors)} distractors, {len(rows)} suspects")
    print("\nsuspects per relation:")
    for rel, n in Counter(r["relation"] for r in rows).most_common():
        print(f"  {rel:14s} {n}")
    cats = Counter(r["category"] for r in rows if r["category"])
    print("\nsuspects per category:", dict(cats.most_common()) or "(none given)")
    meta = read_originals_csv(root)
    print("originals per category:", dict(Counter(m.get("category", "") for m in meta.values()).most_common()) or "(no originals.csv)")
    print("platforms:", dict(Counter(r["platform"] for r in rows if r["platform"]).most_common()) or "(none)")
    print("tools:", dict(Counter(r["tool"] for r in rows if r["tool"]).most_common()))
    warnings = []
    if bad:
        warnings.append(f"{len(bad)} suspects reference an original_id that is not in originals/ (first: {bad[0]})")
    unused = known - {r["original_id"] for r in rows if r["original_id"]}
    if unused:
        warnings.append(f"{len(unused)} originals have no suspect at all")
    need = {"platform": 30, "ai_light": 20, "ai_medium": 20, "ai_heavy": 15, "sibling": 20, "hard_negative": 20, "unrelated": 50}
    counts = Counter(r["relation"] for r in rows)
    for rel, minimum in need.items():
        if counts.get(rel, 0) < minimum:
            warnings.append(f"only {counts.get(rel, 0)} '{rel}' suspects (recommended >= {minimum})")
    if len(distractors) < 100:
        warnings.append(f"only {len(distractors)} distractors (>= 1000 recommended for registry-scale and latency tests)")
    print("\n" + ("Warnings:\n  - " + "\n  - ".join(warnings) if warnings else "Layout OK."))


def read_originals_csv(root):
    path = os.path.join(root, "originals.csv")
    if not os.path.exists(path):
        return {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        return {r["original_id"]: r for r in csv.DictReader(f)}


# ----------------------------------------------------------------------------- registry + run

async def build_registry(root, work_dir, cache_path, reuse):
    """Mock database holding every original + distractor, with all classic and gate features."""
    from mongomock_motor import AsyncMongoMockClient
    from PIL import Image

    from app import ingestion, storage
    from app.fingerprint.combine import fingerprint_sync
    from app.gate.features import compute_and_store

    import hashlib

    db = AsyncMongoMockClient().gate_eval
    meta = read_originals_csv(root)
    skip = registry_exclusions(root)
    entries = [(os.path.splitext(f)[0], os.path.join(root, "originals", f), meta.get(os.path.splitext(f)[0], {}).get("group") or os.path.splitext(f)[0])
               for f in list_images(os.path.join(root, "originals")) if f not in skip]
    # Register each distinct image once: duplicate distractors (or copies of an original) would only
    # crowd the candidate list and turn a correct match into an "other work" claim.
    seen = {hashlib.sha256(open(p, "rb").read()).hexdigest() for _, p, _ in entries}
    n_dup = 0
    for f in list_images(os.path.join(root, "distractors")):
        p = os.path.join(root, "distractors", f)
        h = hashlib.sha256(open(p, "rb").read()).hexdigest()
        if h in seen:
            n_dup += 1
            continue
        seen.add(h)
        entries.append((os.path.splitext(f)[0], p, "distractor"))
    print(f"Registry: {len(entries)} works ({len(skip)} originals excluded, {n_dup} duplicate distractors skipped)")
    if not entries:
        sys.exit("No images in originals/ or distractors/")

    cached = {}
    if reuse and os.path.exists(cache_path):
        with open(cache_path, encoding="utf-8") as f:
            cached = json.load(f)
        print(f"Reusing registry cache ({len(cached)} works)")

    store = {}
    t0 = time.time()
    for i, (wid, path, group) in enumerate(entries, 1):
        raw = open(path, "rb").read()
        with Image.open(path) as probe:
            fmt = probe.format
        rel = storage.save_image(raw, fmt, name=wid)
        if wid in cached:
            rec = cached[wid]
        else:
            try:
                img = ingestion.normalize(raw)
                fp = fingerprint_sync(img)
                tmp_db = AsyncMongoMockClient().tmp
                await compute_and_store(tmp_db, wid, raw)
                gf = await tmp_db.gate_features.find_one({"work_id": wid})
            except Exception as e:  # an unregistrable image must not stop a long run
                print(f"  ! registry: skipping {wid}: {type(e).__name__}: {e}", flush=True)
                continue
            rec = {"phash": fp["phash"], "embedding": fp["embedding"], "width": img.size[0], "height": img.size[1],
                   "dino": gf["vector"], "crops": gf.get("crop_vectors")}
        store[wid] = rec
        await db.works.insert_one({"id": wid, "user_id": group, "owner_name": group, "title": wid,
                                   "phash": rec["phash"], "embedding": rec["embedding"], "width": rec["width"],
                                   "height": rec["height"], "image_path": rel})
        feature = {"work_id": wid, "model": "dinov2-small", "vector": rec["dino"]}
        if rec.get("crops"):
            feature["crop_vectors"] = rec["crops"]
        await db.gate_features.insert_one(feature)
        if wid in cached and not _sift_exists(wid):
            await compute_and_store(AsyncMongoMockClient().tmp2, wid, raw, dino=False, sift=True)
        if i % 10 == 0 or i == len(entries):
            rate = (time.time() - t0) / i
            print(f"  registry {i}/{len(entries)}  ({rate:.1f}s/work)", flush=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(store, f)
    return db, store


def _sift_exists(wid):
    from app.gate.features import has_sift
    return has_sift(wid)


def classic_matrices(store):
    from app.registry.index import phash_bits
    ids = list(store)
    E = np.asarray([store[i]["embedding"] for i in ids], np.float32)
    B = np.asarray([phash_bits(store[i]["phash"]) for i in ids], np.uint8)
    return ids, E, B


def classic_scores(raw, ids, E, B, true_id):
    from app import ingestion
    from app.fingerprint.combine import combined_confidence, fingerprint_sync
    from app.registry.index import phash_bits

    fp = fingerprint_sync(ingestion.normalize(raw))
    e_sim = E @ np.asarray(fp["embedding"], np.float32)
    p_sim = np.maximum(0.0, 1.0 - (B != phash_bits(fp["phash"])[None, :]).sum(axis=1) / B.shape[1])
    conf = combined_confidence(p_sim, e_sim)
    top = int(np.argmax(conf))
    out = {"top_id": ids[top], "top_conf": float(conf[top]), "max_phash": float(p_sim.max()), "max_emb": float(e_sim.max()),
           "true_conf": None, "true_rank": None, "phash_true": None, "emb_true": None}
    if true_id in ids:
        t = ids.index(true_id)
        out.update(true_conf=float(conf[t]), true_rank=int((conf > conf[t]).sum()) + 1,
                   phash_true=float(p_sim[t]), emb_true=float(e_sim[t]))
    return out


async def run_suspects(root, rows, db, store, out_dir, args):
    from app.gate.pipeline import run_gate
    from app.gate.verdict import CLAIM_GRADE

    runs_path = os.path.join(out_dir, "runs.jsonl")
    done = set()
    if args.resume and os.path.exists(runs_path):
        with open(runs_path, encoding="utf-8") as f:
            done = {json.loads(line)["file"] for line in f if line.strip()}
        print(f"Resuming: {len(done)} suspects already done")
    todo = [r for r in rows if r["file"] not in done]
    if args.order == "priority":
        # Everything except the (repetitive, 12-per-original) classical edits first, then the classical
        # ones in a seeded random order: any prefix of the run is then a balanced, unbiased sample, so a
        # long run can be stopped, batched (--limit + --resume) or analysed part-way.
        rest = [r for r in todo if r["relation"] != "classical"]
        classical = [r for r in todo if r["relation"] == "classical"]
        random.Random(7).shuffle(classical)
        todo = rest + classical
        if args.limit:
            todo = todo[:args.limit]
    elif args.limit:
        random.Random(1).shuffle(todo)
        todo = todo[:args.limit]
    ids, E, B = classic_matrices(store)
    print(f"Running {len(todo)} suspects against a registry of {len(store)} works")

    t0 = time.time()
    with open(runs_path, "a", encoding="utf-8") as out:
        for i, r in enumerate(todo, 1):
            raw = open(suspect_path(root, r["file"]), "rb").read()
            rec = {k: r.get(k, "") for k in ("file", "original_id", "relation", "category", "edit", "tool", "platform", "split")}
            try:
                rec["classic"] = classic_scores(raw, ids, E, B, r["original_id"])
                with_ev = bool(args.evidence_every) and (i % args.evidence_every == 0)
                verdict = await asyncio.wait_for(run_gate(raw, db, check_id=f"eval-{i}", with_evidence=with_ev), 180)
                rec["gate"] = {
                    "claims": [{"work_id": c.candidate_work_id, "classification": c.classification,
                                "grade": CLAIM_GRADE[c.classification]} for c in verdict.claims],
                    "candidates": [{"work_id": c.work_id, "classification": c.classification, "metrics": c.metrics,
                                    "error_reason": c.error_reason} for c in verdict.candidates],
                    "timings": verdict.timings.model_dump(),
                    "warnings": verdict.warnings,
                    "origin": verdict.origin.get("details"),
                }
            except Exception as e:  # keep going: one bad file must not stop a long run
                rec["error"] = f"{type(e).__name__}: {e}"
            out.write(json.dumps(rec) + "\n")
            out.flush()
            if i % 10 == 0 or i == len(todo):
                eta = (time.time() - t0) / i * (len(todo) - i)
                print(f"  {i}/{len(todo)}  last={r['file']}  eta {eta / 60:.1f} min", flush=True)


# ----------------------------------------------------------------------------- analysis

def load_runs(out_dir):
    with open(os.path.join(out_dir, "runs.jsonl"), encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_label_fixes(root):
    """Corrections found by reviewing results, kept next to the dataset so they are explicit and auditable.

    label_overrides.csv : file, relation, original_id, reason   -> relabel one suspect
    work_aliases.csv    : work_id, same_as, reason              -> two registered works are the same image
                          (e.g. a distractor that is a crop of an original); claims on either count as the true work
    """
    overrides, aliases = {}, {}
    if not root:
        return overrides, aliases
    p = os.path.join(root, "label_overrides.csv")
    if os.path.exists(p):
        with open(p, newline="", encoding="utf-8-sig") as f:
            overrides = {r["file"]: r for r in csv.DictReader(f)}
    p = os.path.join(root, "work_aliases.csv")
    if os.path.exists(p):
        with open(p, newline="", encoding="utf-8-sig") as f:
            aliases = {r["work_id"]: r["same_as"] for r in csv.DictReader(f)}
    return overrides, aliases


def apply_label_fixes(recs, overrides, aliases):
    """Relabel suspects and fold alias works into their canonical work, in place. Returns what changed."""
    log = []
    for r in recs:
        o = overrides.get(r["file"])
        if o:
            log.append(f"{r['file']}: {r['relation']} -> {o['relation']} (original_id {o.get('original_id') or '-'}): {o.get('reason', '')}")
            r["relation"], r["original_id"] = o["relation"], o.get("original_id", "")
        if aliases and r.get("gate"):
            for c in r["gate"]["claims"]:
                c["work_id"] = aliases.get(c["work_id"], c["work_id"])
            for c in r["gate"]["candidates"]:
                c["work_id"] = aliases.get(c["work_id"], c["work_id"])
            r["original_id"] = aliases.get(r["original_id"], r["original_id"])
            # an alias candidate next to its canonical one is the same work seen twice: keep the stronger grade
            seen = {}
            for c in r["gate"]["candidates"]:
                rank = {"TIER1": 5, "TIER2": 4, "RELATED_DIFFERENT_CAPTURE": 3, "TIER3": 2, "NONE": 1}.get(c["classification"], 0)
                if c["work_id"] not in seen or rank > seen[c["work_id"]][0]:
                    seen[c["work_id"]] = (rank, c)
            r["gate"]["candidates"] = [v[1] for v in seen.values()]
            uniq, keys = [], set()
            for c in r["gate"]["claims"]:
                if (c["work_id"], c["classification"]) not in keys:
                    keys.add((c["work_id"], c["classification"]))
                    uniq.append(c)
            r["gate"]["claims"] = uniq
    return log


def true_cand(rec):
    for c in (rec.get("gate") or {}).get("candidates", []):
        if c["work_id"] == rec["original_id"]:
            return c
    return None


def natural(rec):
    c = true_cand(rec)
    return c["classification"] if c else "NOT_RETRIEVED"


def claims(rec):
    return (rec.get("gate") or {}).get("claims", [])


def claim_on_true(rec):
    return next((c["classification"] for c in claims(rec) if c["work_id"] == rec["original_id"]), None)


def evidence_claims(rec):
    return [c for c in claims(rec) if c["grade"] == "evidence"]


def miss_reason(rec):
    """Why a positive was not graded Tier 1."""
    c = true_cand(rec)
    if c is None:
        return "not_retrieved"
    m = c["metrics"]
    if not m.get("credible"):
        return f"not_credible:{m.get('verify_reason', c.get('error_reason') or '?')}"
    if m.get("low_information"):
        return "low_information"
    return f"graded_{c['classification']}"


def natural_tier1_any(rec):
    return any(c["classification"] == "TIER1" for c in (rec.get("gate") or {}).get("candidates", []))


def tier1_ok(m, p):
    """The Tier 1 predicate on one candidate's logged metrics under thresholds `p`."""
    if not m.get("credible") or m.get("residual_p90") is None or m.get("low_information"):
        return False
    hp = m.get("hp_ncc")
    return (m["residual_p90"] <= p["p90"] and m["flow_median_px"] <= p["flow"]
            and m["residual_median"] <= p["med"] and m["changed_frac"] <= p["chg"]
            and (hp is None or hp >= p["hp"]))


def table(rows_, headers):
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows_]
    return "\n".join(out)


def tpr_at_fpr(pos, neg, fpr):
    if not len(pos) or not len(neg):
        return None
    thr = np.quantile(neg, 1 - fpr)
    return float((np.asarray(pos) > thr).mean())


def analyze(out_dir, recs, registry_size, meta):
    ok = [r for r in recs if "error" not in r]
    errors = [r for r in recs if "error" in r]
    md = [f"# Gate evaluation ({meta.get('started', '')})", "",
          f"{len(recs)} suspects ({len(errors)} errored) against a registry of {registry_size} works. "
          f"Gate config `{str(meta.get('config_hash', ''))[:12]}`, pipeline {meta.get('pipeline_version', '?')}.", ""]
    summary = {"suspects": len(recs), "errors": len(errors), "registry": registry_size}

    by_rel = defaultdict(list)
    for r in ok:
        by_rel[r["relation"]].append(r)

    # ---- positives: should be Tier 1
    md += ["## Alterations that must be caught (copy / classical / platform)", ""]
    rows_ = []
    for rel in sorted(POSITIVE & set(by_rel)):
        rs = by_rel[rel]
        n = len(rs)
        retrieved = sum(true_cand(r) is not None for r in rs)
        t1 = sum(natural(r) == "TIER1" for r in rs)
        t12 = sum(natural(r) in EVIDENCE for r in rs)
        anyc = sum(claim_on_true(r) is not None for r in rs)
        evc = sum(claim_on_true(r) in EVIDENCE for r in rs)
        wrong = sum(any(c["work_id"] != r["original_id"] for c in evidence_claims(r)) for r in rs)
        rows_.append((rel, n, pct(retrieved, n), pct(t1, n), pct(t12, n), pct(anyc, n), pct(evc, n), pct(wrong, n)))
    md += [table(rows_, ["relation", "n", "retrieved (in top-k)", "Tier 1 (natural)", "Tier 1/2 (natural)",
                         "any claim reported", "evidence claim reported", "evidence on WRONG work"]), ""]
    pos_all = [r for rel in POSITIVE for r in by_rel.get(rel, [])]
    summary["positive"] = {"n": len(pos_all), "tier1": sum(natural(r) == "TIER1" for r in pos_all),
                           "retrieved": sum(true_cand(r) is not None for r in pos_all),
                           "any_claim": sum(claim_on_true(r) is not None for r in pos_all)}

    # per edit / platform / category
    for key, title in (("edit", "Per edit"), ("platform", "Per platform"), ("category", "Per image category")):
        groups = defaultdict(list)
        for r in pos_all:
            if r.get(key):
                groups[r[key]].append(r)
        if groups:
            rows_ = []
            for g, rs in sorted(groups.items(), key=lambda kv: sum(natural(r) == "TIER1" for r in kv[1]) / len(kv[1])):
                n = len(rs)
                reasons = Counter(miss_reason(r) for r in rs if natural(r) != "TIER1").most_common(2)
                rows_.append((g, n, pct(sum(true_cand(r) is not None for r in rs), n),
                              pct(sum(natural(r) == "TIER1" for r in rs), n),
                              pct(sum(claim_on_true(r) is not None for r in rs), n),
                              "; ".join(f"{k} x{v}" for k, v in reasons)))
            md += [f"### {title} (worst first)", "",
                   table(rows_, [key, "n", "retrieved", "Tier 1", "any claim", "main reasons for not Tier 1"]), ""]

    reasons = Counter(miss_reason(r) for r in pos_all if natural(r) != "TIER1")
    if reasons:
        md += ["### Why positives were not Tier 1", "", table(reasons.most_common(), ["reason", "count"]), ""]

    # ---- AI edits
    ai = [r for rel in AI_EDIT | AI_HEAVY for r in by_rel.get(rel, [])]
    if ai:
        md += ["## AI-edited copies", ""]
        rows_ = []
        for rel in sorted((AI_EDIT | AI_HEAVY) & set(by_rel)):
            rs = by_rel[rel]
            n = len(rs)
            rows_.append((rel, n, pct(sum(true_cand(r) is not None for r in rs), n),
                          pct(sum(claim_on_true(r) in EVIDENCE for r in rs), n),
                          pct(sum(claim_on_true(r) in LEAD for r in rs), n),
                          pct(sum(claim_on_true(r) is None for r in rs), n)))
        md += [table(rows_, ["relation", "n", "retrieved", "evidence claim", "lead claim", "no claim"]), "",
               "Heavy regeneration is expected to end as *no claim* (an information limit); a hit there is a bonus.", ""]

    # ---- negatives
    md += ["## What must NOT be claimed as evidence (false-evidence rate, 95% upper bound)", ""]
    rows_ = []
    neg_all = [r for rel in NEGATIVE for r in by_rel.get(rel, [])]
    for rel in sorted(NEGATIVE & set(by_rel)):
        rs = by_rel[rel]
        n = len(rs)
        fe = sum(bool(evidence_claims(r)) for r in rs)
        nat = sum(any(c["classification"] in EVIDENCE for c in r["gate"]["candidates"]) for r in rs)
        lead = sum(any(c["grade"] == "lead" for c in claims(r)) for r in rs)
        rows_.append((rel, n, f"{fe} ({pct(fe, n)})", f"<= {100 * cp_upper(fe, n):.1f}%", nat, f"{lead} ({pct(lead, n)})"))
    fe_all = sum(bool(evidence_claims(r)) for r in neg_all)
    rows_.append(("**all negatives**", len(neg_all), f"{fe_all} ({pct(fe_all, len(neg_all))})",
                  f"<= {100 * cp_upper(fe_all, len(neg_all)):.1f}%", "", ""))
    md += [table(rows_, ["relation", "n", "false evidence claims", "upper bound", "natural Tier1/2 on any candidate",
                         "lead claims"]), "",
           "A *lead* on a sibling / same-template pair is acceptable (it asks a human to look); a lead on an "
           "`unrelated` image is a false lead.", ""]
    summary["negatives"] = {"n": len(neg_all), "false_evidence": fe_all, "upper95": cp_upper(fe_all, len(neg_all))}

    fe_cases = [r for r in neg_all if evidence_claims(r)]
    # ---- comparison with the classic scores
    md += ["## Gate vs classic fingerprint scores", ""]
    pos_for_classic = [r for r in ok if r["relation"] in POSITIVE | AI_EDIT and r["classic"]["true_conf"] is not None]
    neg_for_classic = [r for r in ok if r["relation"] in NEGATIVE]
    if pos_for_classic and neg_for_classic:
        rows_ = []
        for name, pk, nk in (("pHash", "phash_true", "max_phash"), ("CLIP embedding", "emb_true", "max_emb"),
                             ("fused confidence", "true_conf", "top_conf")):
            pos = [r["classic"][pk] for r in pos_for_classic]
            neg = [r["classic"][nk] for r in neg_for_classic]
            rows_.append((name, pct(sum(tpr_at_fpr(pos, neg, f) * len(pos) for f in (0.01,)), len(pos)) if neg else "-",
                          f"{100 * (tpr_at_fpr(pos, neg, 0.001) or 0):.1f}%", len(neg)))
        md += [f"Positives = copy/classical/platform + ai_light/ai_medium ({len(pos_for_classic)}); negatives = "
               f"siblings, templates, hard and unrelated ({len(neg_for_classic)}). TPR at a fixed false-positive rate on those negatives:", "",
               table(rows_, ["score", "TPR @ 1% FPR", "TPR @ 0.1% FPR", "n negatives"]), ""]

    def rate(rs, pred):
        return pct(sum(pred(r) for r in rs), len(rs))

    pos_ev = [r for r in ok if r["relation"] in POSITIVE]
    rows_ = []
    for label, pred in (("classic fused >= likely (0.996)", lambda r: (r["classic"]["true_conf"] or 0) >= 0.996),
                        ("classic fused >= possible (0.27)", lambda r: (r["classic"]["true_conf"] or 0) >= 0.27)):
        rows_.append((label, rate(pos_ev, pred),
                      rate([r for r in ok if r["relation"] in HARD_NEG], lambda r: r["classic"]["top_conf"] >= (0.996 if "likely" in label else 0.27)),
                      rate([r for r in ok if r["relation"] in UNRELATED], lambda r: r["classic"]["top_conf"] >= (0.996 if "likely" in label else 0.27))))
    rows_.append(("gate: evidence claim (Tier 1/2) on the right work", rate(pos_ev, lambda r: claim_on_true(r) in EVIDENCE),
                  rate([r for r in ok if r["relation"] in HARD_NEG], lambda r: bool(evidence_claims(r))),
                  rate([r for r in ok if r["relation"] in UNRELATED], lambda r: bool(evidence_claims(r)))))
    rows_.append(("gate: any claim (evidence or lead) on the right work", rate(pos_ev, lambda r: claim_on_true(r) is not None),
                  rate([r for r in ok if r["relation"] in HARD_NEG], lambda r: bool(claims(r))),
                  rate([r for r in ok if r["relation"] in UNRELATED], lambda r: bool(claims(r)))))
    md += ["Operating points as deployed (positives = copy/classical/platform):", "",
           table(rows_, ["system", "detects positives", "fires on hard negatives", "fires on unrelated"]), ""]

    # ---- latency
    tim = [r["gate"]["timings"] for r in ok if r.get("gate")]
    if tim:
        rows_ = []
        for k in ("g0_normalize", "g1_retrieve", "g2_verify", "g3_dense", "g4_classify", "candidates_wall", "g5_evidence", "total"):
            v = sorted(t.get(k, 0.0) for t in tim)
            rows_.append((k, f"{statistics.median(v):.2f}", f"{v[int(0.95 * (len(v) - 1))]:.2f}", f"{v[-1]:.2f}"))
        ncand = [len(r["gate"]["candidates"]) for r in ok if r.get("gate")]
        md += ["## Latency (seconds, CPU)", "", table(rows_, ["stage", "p50", "p95", "max"]), "",
               f"Candidates verified per check: median {statistics.median(ncand):.0f}, max {max(ncand)}. "
               "g2-g4 are sums over candidates; `candidates_wall` is the elapsed time (they run concurrently).", ""]
        summary["latency_p50_total"] = statistics.median(t["total"] for t in tim)
        summary["latency_p95_total"] = sorted(t["total"] for t in tim)[int(0.95 * (len(tim) - 1))]

    warn = Counter(w.split(":")[0][:60] for r in ok for w in (r.get("gate") or {}).get("warnings", []))
    if warn or errors:
        md += ["## Problems during the run", ""]
        if errors:
            md += [f"{len(errors)} suspects errored, e.g. " + "; ".join(f"{r['file']}: {r['error']}" for r in errors[:3]), ""]
        if warn:
            md += [table(warn.most_common(10), ["warning", "count"]), ""]

    # ---- files
    with open(os.path.join(out_dir, "per_candidate.csv"), "w", newline="", encoding="utf-8") as f:
        keys = ["credible", "verify_reason", "method", "flip", "low_feature", "via_crop", "inlier_count", "inlier_coverage_q",
                "inlier_coverage_t", "tight_inlier_frac", "residual_median", "residual_p90", "changed_frac", "info_frac",
                "low_information", "hp_ncc", "noise_ncc", "flow_median_px", "edge_corr_fine", "ssim", "clip_sim", "dino_sim"]
        w = csv.writer(f)
        w.writerow(["file", "relation", "category", "edit", "original_id", "work_id", "is_true", "natural_grade"] + keys)
        for r in ok:
            for c in (r.get("gate") or {}).get("candidates", []):
                w.writerow([r["file"], r["relation"], r["category"], r["edit"], r["original_id"], c["work_id"],
                            int(c["work_id"] == r["original_id"]), c["classification"]] + [c["metrics"].get(k, "") for k in keys])
    with open(os.path.join(out_dir, "failures.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["kind", "file", "relation", "edit", "category", "detail"])
        for r in fe_cases:
            w.writerow(["FALSE_EVIDENCE", r["file"], r["relation"], r["edit"], r["category"],
                        ";".join(f"{c['classification']}->{c['work_id']}" for c in evidence_claims(r))])
        for r in ok:
            if r["relation"] in UNRELATED and claims(r):
                w.writerow(["FALSE_LEAD", r["file"], r["relation"], r["edit"], r["category"],
                            ";".join(f"{c['classification']}->{c['work_id']}" for c in claims(r))])
        for r in pos_all:
            if natural(r) != "TIER1":
                w.writerow(["MISS", r["file"], r["relation"], r["edit"], r["category"], miss_reason(r)])
    md += ["Per-candidate metrics: `per_candidate.csv`. Every false-evidence case, false lead and missed positive: `failures.csv`.", ""]

    with open(os.path.join(out_dir, "summary.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    with open(os.path.join(out_dir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print("\n".join(md[:60]))


# ----------------------------------------------------------------------------- threshold sweep

GRID = {"p90": [10, 15, 20, 25, 30, 40], "flow": [1.0, 2.0, 3.0, 5.0], "med": [4, 6, 8, 12, 16],
        "chg": [0.05, 0.10, 0.15, 0.25, 0.4], "hp": [0.0, 0.1, 0.2, 0.3, 0.5]}


def sweep(out_dir, recs, current):
    ok = [r for r in recs if "error" not in r and r.get("gate")]
    pos = [r for r in ok if r["relation"] in POSITIVE]
    neg = [r for r in ok if r["relation"] in NEGATIVE]
    if len(pos) < 10 or len(neg) < 10:
        msg = f"Not enough data to sweep ({len(pos)} positives, {len(neg)} negatives; need >= 10 of each)."
        print(msg)
        open(os.path.join(out_dir, "sweep.md"), "w").write(msg + "\n")
        return

    def true_metrics(r):
        c = true_cand(r)
        return c["metrics"] if c else None

    def pass_vec(metrics_list, combos):
        # (combos, items) boolean matrix
        out = np.zeros((len(combos), len(metrics_list)), bool)
        for j, ms in enumerate(metrics_list):
            for k, m in enumerate(combos):
                out[k, j] = any(m is not None and tier1_ok(mm, m) for mm in ms)
        return out

    combos = [dict(p90=a, flow=b, med=c, chg=d, hp=e) for a in GRID["p90"] for b in GRID["flow"]
              for c in GRID["med"] for d in GRID["chg"] for e in GRID["hp"]]
    pos_ms = [[true_metrics(r)] if true_metrics(r) else [] for r in pos]
    neg_ms = [[c["metrics"] for c in r["gate"]["candidates"]] for r in neg]
    P = pass_vec(pos_ms, combos)
    N = pass_vec(neg_ms, combos)
    tpr, fp = P.mean(axis=1), N.sum(axis=1)

    def fmt(c):
        return f"p90<={c['p90']}, flow<={c['flow']}, median<={c['med']}, changed<={c['chg']}, hp>={c['hp']}"

    cur_i = None
    for i, c in enumerate(combos):
        if c == current:
            cur_i = i
    md = ["# Tier 1 threshold sweep", "",
          f"{len(pos)} positives (copy/classical/platform), {len(neg)} negatives (siblings, templates, hard, unrelated); "
          f"{len(combos)} threshold combinations. A negative counts as a false Tier 1 if *any* of its candidates passes.", ""]
    if cur_i is not None:
        md += [f"**Current settings** ({fmt(current)}): recall {100 * tpr[cur_i]:.1f}%, false Tier 1 on {fp[cur_i]} of {len(neg)} negatives.", ""]
    else:
        md += ["Current settings are not on the sweep grid; see the table for nearby points.", ""]

    zero = np.where(fp == 0)[0]
    md += ["## Best combinations with zero false Tier 1 on this data", ""]
    if len(zero):
        order = zero[np.argsort(-tpr[zero], kind="stable")][:12]
        md += [table([(fmt(combos[i]), f"{100 * tpr[i]:.1f}%") for i in order], ["thresholds", "recall"]), ""]
    else:
        best = np.argsort(fp, kind="stable")[:8]
        md += ["**No combination avoids false Tier 1s on this data.** Lowest false-positive points:", "",
               table([(fmt(combos[i]), f"{100 * tpr[i]:.1f}%", int(fp[i])) for i in best], ["thresholds", "recall", "false Tier 1"]), ""]

    # grouped cross-validation: pick thresholds on train folds, judge on the held-out one
    def group_of(r):
        return r.get("original_id") or r["file"]

    groups = sorted({group_of(r) for r in pos + neg})
    rng = random.Random(0)
    rng.shuffle(groups)
    fold_of = {g: i % 5 for i, g in enumerate(groups)}
    held_tpr, held_fp, chosen = [], 0, []
    for k in range(5):
        tr_p = np.array([fold_of[group_of(r)] != k for r in pos])
        tr_n = np.array([fold_of[group_of(r)] != k for r in neg])
        if not tr_p.any() or tr_p.all() or not tr_n.any() or tr_n.all():
            continue
        fp_tr, tpr_tr = N[:, tr_n].sum(axis=1), P[:, tr_p].mean(axis=1)
        cand = np.where(fp_tr == fp_tr.min())[0]
        cand = cand[np.argsort(-tpr_tr[cand], kind="stable")]
        top = cand[tpr_tr[cand] >= tpr_tr[cand][0] - 1e-9]
        pick = top[len(top) // 2]  # the middle of the tied optimum, not an extreme
        chosen.append(combos[pick])
        held_tpr.append(P[pick, ~tr_p].mean() if (~tr_p).any() else float("nan"))
        held_fp += int(N[pick, ~tr_n].sum())
    if chosen:
        md += ["## Grouped 5-fold cross-validation (thresholds chosen on train folds only)", "",
               f"Held-out recall: {100 * np.nanmean(held_tpr):.1f}% mean; held-out false Tier 1: {held_fp} of {len(neg)} negatives "
               f"(upper 95% bound {100 * cp_upper(held_fp, len(neg)):.1f}%).", "",
               "Chosen per fold: " + " | ".join(fmt(c) for c in chosen), ""]

    # how close do negatives get?
    rows_ = []
    for key in ("residual_p90", "residual_median", "changed_frac", "flow_median_px", "hp_ncc", "noise_ncc"):
        pos_v = [m[key] for r in pos if (m := true_metrics(r)) and m.get(key) is not None and m.get("credible")]
        neg_v = [c["metrics"][key] for r in neg for c in r["gate"]["candidates"]
                 if c["metrics"].get("credible") and c["metrics"].get(key) is not None]
        if pos_v and neg_v:
            q = lambda v, p: f"{np.percentile(v, p):.2f}"  # noqa: E731
            rows_.append((key, f"{q(pos_v, 5)} / {q(pos_v, 50)} / {q(pos_v, 95)}", f"{q(neg_v, 5)} / {q(neg_v, 50)} / {q(neg_v, 95)}"))
    if rows_:
        md += ["## Metric distributions (5th / 50th / 95th percentile, credible candidates only)", "",
               table(rows_, ["metric", "positives (true work)", "negatives (all candidates)"]),
               "", "A metric helps only if these ranges barely overlap. `noise_ncc` is logged but not used by the classifier.", ""]

    with open(os.path.join(out_dir, "sweep.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    print("\n".join(md[:40]))


# ----------------------------------------------------------------------------- main

async def amain(args):
    if args.analyze_only:
        out_dir = args.analyze_only
        meta = json.load(open(os.path.join(out_dir, "meta.json"))) if os.path.exists(os.path.join(out_dir, "meta.json")) else {}
        recs = load_runs(out_dir)
        if args.split:
            recs = [r for r in recs if (r.get("split") or "dev") == args.split]
            meta["started"] = f"{meta.get('started', '')}, split={args.split}"
            out_dir = os.path.join(out_dir, f"split_{args.split}")
            os.makedirs(out_dir, exist_ok=True)
    else:
        root = args.dataset
        if args.validate:
            validate_dataset(root)
            return
        rows = load_manifest(root)
        if args.only_files:  # re-run just these suspects (one manifest `file` per line)
            wanted = {l.strip() for l in open(args.only_files, encoding="utf-8") if l.strip()}
            rows = [r for r in rows if r["file"] in wanted]
            print(f"{len(rows)} suspects selected from {args.only_files}")
        if args.split:  # optional `split` column (dev/test); blank counts as dev
            rows = [r for r in rows if (r.get("split") or "dev") == args.split]
            print(f"{len(rows)} suspects in split '{args.split}'")
        out_dir = args.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), "results_gate",
                                           datetime.now().strftime("%Y%m%d-%H%M%S"))
        os.makedirs(out_dir, exist_ok=True)
        work_dir = os.path.join(out_dir, "_work")
        os.makedirs(work_dir, exist_ok=True)

        from app.config import settings as app_settings
        app_settings.UPLOAD_DIR = work_dir  # keeps every cache/evidence file out of backend/uploads

        import cv2
        import torch

        from app.gate.pipeline import PIPELINE_VERSION
        from app.gate.settings import config_hash, config_snapshot
        meta = {"started": datetime.now().isoformat(timespec="seconds"), "dataset": os.path.abspath(root),
                "config_hash": config_hash, "pipeline_version": PIPELINE_VERSION, "config": json.loads(config_snapshot),
                "opencv": cv2.__version__, "torch": torch.__version__}
        json.dump(meta, open(os.path.join(out_dir, "meta.json"), "w"), indent=2)

        db, store = await build_registry(root, work_dir, os.path.join(out_dir, "registry_cache.json"), args.reuse_registry)
        meta["registry"] = len(store)
        json.dump(meta, open(os.path.join(out_dir, "meta.json"), "w"), indent=2)
        await run_suspects(root, rows, db, store, out_dir, args)
        recs = load_runs(out_dir)

    overrides, aliases = load_label_fixes(args.dataset or meta.get("dataset"))
    fix_log = apply_label_fixes(recs, overrides, aliases) if (overrides or aliases) else []
    if fix_log or aliases:
        with open(os.path.join(out_dir, "label_fixes_applied.md"), "w", encoding="utf-8") as f:
            lines = ["# Label fixes applied to this analysis", ""] + [f"- {x}" for x in fix_log]
            lines += ["", "Aliases (same image registered twice):"] + [f"- {k} == {v}" for k, v in aliases.items()]
            f.write(chr(10).join(lines) + chr(10))
        print(f"Applied {len(fix_log)} relabels and {len(aliases)} work aliases (see label_fixes_applied.md)")
    registry = meta.get("registry") or len({r["original_id"] for r in recs})
    analyze(out_dir, recs, registry, meta)
    if args.sweep:
        cur = meta.get("config", {})
        current = {"p90": cur.get("tier1_residual_p90_max"), "flow": cur.get("tier1_flow_median_max_px"),
                   "med": cur.get("tier1_residual_median_max"), "chg": cur.get("tier1_changed_frac_max"),
                   "hp": cur.get("tier1_hp_ncc_min")}
        sweep(out_dir, recs, current)
    print(f"\nResults in {out_dir}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", help="dataset directory (see docs/DATASET_SPEC.md)")
    ap.add_argument("--out", help="output directory (default: eval/results_gate/<timestamp>)")
    ap.add_argument("--analyze-only", metavar="OUT_DIR", help="recompute the tables from an earlier run")
    ap.add_argument("--limit", type=int, help="run only N suspects this time (random sample; the first N with --order priority)")
    ap.add_argument("--order", choices=["manifest", "priority"], default="manifest",
                    help="priority: non-classical suspects first, then classical in random order (balanced prefixes, batchable)")
    ap.add_argument("--resume", action="store_true", help="skip suspects already in runs.jsonl")
    ap.add_argument("--reuse-registry", action="store_true", help="reuse registry_cache.json from --out")
    ap.add_argument("--evidence-every", type=int, default=0, help="also write evidence images for every Nth suspect")
    ap.add_argument("--sweep", action="store_true", help="also fit Tier 1 thresholds (grouped cross-validation)")
    ap.add_argument("--only-files", metavar="LIST", help="text file with one manifest `file` per line: run only these suspects")
    ap.add_argument("--validate", action="store_true", help="check the dataset layout/manifest and print its coverage, then stop")
    ap.add_argument("--split", choices=["dev", "test"], help="run only suspects whose manifest `split` column matches (blank = dev)")
    args = ap.parse_args()
    if not args.dataset and not args.analyze_only:
        ap.error("--dataset or --analyze-only is required")
    asyncio.run(amain(args))


if __name__ == "__main__":
    main()
