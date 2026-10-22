"""Collect every number the deck shows from a gate_eval run directory (+ label fixes) into deck_data.json."""
import json, sys, collections, statistics, csv, os
sys.path.insert(0, r"C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\backend")
from eval import gate_eval as G
RUN, OUT = sys.argv[1], sys.argv[2]
ROOT = r"C:\Users\Anisha\Desktop\Aayush\24CS051\DigitalAsset\dataset"
recs = [json.loads(l) for l in open(os.path.join(RUN, "runs.jsonl"), encoding="utf-8") if l.strip()]
ov, al = G.load_label_fixes(ROOT); G.apply_label_fixes(recs, ov, al)
ok = [r for r in recs if "error" not in r and r.get("gate")]
nat, ct, tc = G.natural, G.claim_on_true, G.true_cand
pct = lambda k, n: round(100 * k / n, 1) if n else None
d = {"suspects": len(recs), "errors": len(recs) - len(ok)}
meta = json.load(open(os.path.join(RUN, "meta.json"))) if os.path.exists(os.path.join(RUN, "meta.json")) else {}
d["registry"] = meta.get("registry"); d["config_version"] = meta.get("pipeline_version")
d["relations"] = dict(collections.Counter(r["relation"] for r in ok))
POS = ("classical", "copy", "platform")
pos = [r for r in ok if r["relation"] in POS]
d["positive"] = {rel: {"n": len([r for r in ok if r["relation"] == rel]),
                       "tier1": pct(sum(nat(r) == "TIER1" for r in ok if r["relation"] == rel), len([r for r in ok if r["relation"] == rel])),
                       "any_claim": pct(sum(ct(r) is not None for r in ok if r["relation"] == rel), len([r for r in ok if r["relation"] == rel])),
                       "retrieved": pct(sum(tc(r) is not None for r in ok if r["relation"] == rel), len([r for r in ok if r["relation"] == rel]))}
                 for rel in POS if any(r["relation"] == rel for r in ok)}
d["positive_all"] = {"n": len(pos), "tier1": pct(sum(nat(r) == "TIER1" for r in pos), len(pos)), "any_claim": pct(sum(ct(r) is not None for r in pos), len(pos))}
def grp(key, rs):
    g = collections.defaultdict(list)
    for r in rs: g[r[key]].append(r)
    return {k: {"n": len(v), "tier1": pct(sum(nat(r) == "TIER1" for r in v), len(v)), "any_claim": pct(sum(ct(r) is not None for r in v), len(v))} for k, v in g.items() if k}
cl = [r for r in ok if r["relation"] == "classical"]
d["by_edit"] = grp("edit", cl); d["by_category"] = grp("category", cl)
# merge tiny categories for readability
cats = d["by_category"]; big = {k: v for k, v in cats.items() if v["n"] >= 15}; small = [v for k, v in cats.items() if v["n"] < 15]
if small:
    n = sum(v["n"] for v in small); big["other photos (small groups)"] = {"n": n, "tier1": pct(sum(v["tier1"] * v["n"] / 100 for v in small), n), "any_claim": pct(sum(v["any_claim"] * v["n"] / 100 for v in small), n)}
d["by_category_merged"] = big
d["miss_reasons"] = dict(collections.Counter(G.miss_reason(r) for r in pos if nat(r) != "TIER1").most_common(8))
ai = {}
for rel in ("ai_light", "ai_medium", "ai_heavy"):
    rs = [r for r in ok if r["relation"] == rel]
    if rs:
        ai[rel] = {"n": len(rs), "retrieved": pct(sum(tc(r) is not None for r in rs), len(rs)), "evidence": pct(sum(ct(r) in G.EVIDENCE for r in rs), len(rs)),
                   "lead": pct(sum(ct(r) in G.LEAD for r in rs), len(rs)), "none": pct(sum(ct(r) is None for r in rs), len(rs)),
                   "declared_ai_by_metadata": pct(sum(("trainedalgorithmic" in " ".join(r["gate"].get("origin") or []).lower()) for r in rs), len(rs))}
d["ai"] = ai
neg = {}
for rel in ("sibling", "unrelated"):
    rs = [r for r in ok if r["relation"] == rel]
    if rs:
        fe = sum(bool(G.evidence_claims(r)) for r in rs)
        neg[rel] = {"n": len(rs), "false_evidence": fe, "upper95": round(100 * G.cp_upper(fe, len(rs)), 1), "leads": sum(any(c["grade"] == "lead" for c in r["gate"]["claims"]) for r in rs)}
allneg = [r for r in ok if r["relation"] in G.NEGATIVE]; fe = sum(bool(G.evidence_claims(r)) for r in allneg)
d["negatives"] = {"by_relation": neg, "n": len(allneg), "false_evidence": fe, "upper95": round(100 * G.cp_upper(fe, len(allneg)), 1)}
# classic vs gate at deployed operating points
pos_ev = [r for r in ok if r["relation"] in POS]; hard = [r for r in ok if r["relation"] == "sibling"]; unrel = [r for r in ok if r["relation"] == "unrelated"]
def rate(rs, f): return pct(sum(bool(f(r)) for r in rs), len(rs))
d["compare"] = {
  "classic_strict": {"positives": rate(pos_ev, lambda r: (r["classic"]["true_conf"] or 0) >= 0.996), "siblings": rate(hard, lambda r: r["classic"]["top_conf"] >= 0.996), "unrelated": rate(unrel, lambda r: r["classic"]["top_conf"] >= 0.996)},
  "classic_loose": {"positives": rate(pos_ev, lambda r: (r["classic"]["true_conf"] or 0) >= 0.27), "siblings": rate(hard, lambda r: r["classic"]["top_conf"] >= 0.27), "unrelated": rate(unrel, lambda r: r["classic"]["top_conf"] >= 0.27)},
  "gate_evidence": {"positives": rate(pos_ev, lambda r: ct(r) in G.EVIDENCE), "siblings": rate(hard, lambda r: G.evidence_claims(r)), "unrelated": rate(unrel, lambda r: G.evidence_claims(r))},
  "gate_any": {"positives": rate(pos_ev, lambda r: ct(r) is not None), "siblings": rate(hard, lambda r: r["gate"]["claims"]), "unrelated": rate(unrel, lambda r: r["gate"]["claims"])}}
tim = [r["gate"]["timings"] for r in ok]; q = lambda v, p: sorted(v)[int(p * (len(v) - 1))]
d["latency"] = {k: {"p50": round(statistics.median(t[k] for t in tim), 2), "p95": round(q([t[k] for t in tim], .95), 2)} for k in ("g0_normalize", "g1_retrieve", "candidates_wall", "g5_evidence", "total")}
d["latency"]["candidates_median"] = statistics.median(len(r["gate"]["candidates"]) for r in ok)
d["split"] = {sp: {"n": len([r for r in cl if (r.get("split") or "dev") == sp]), "tier1": pct(sum(nat(r) == "TIER1" for r in cl if (r.get("split") or "dev") == sp), len([r for r in cl if (r.get("split") or "dev") == sp]))} for sp in ("dev", "test")}
d["config"] = meta.get("config", {})
json.dump(d, open(OUT, "w"), indent=1)
print(json.dumps({k: d[k] for k in ("suspects", "positive_all", "negatives", "compare", "latency")}, indent=1)[:2500])
