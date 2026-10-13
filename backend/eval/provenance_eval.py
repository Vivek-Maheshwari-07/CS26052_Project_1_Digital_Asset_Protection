"""Evaluate the origin module (C2PA + IPTC DigitalSourceType) against a labelled provenance set.

    python -m eval.provenance_eval --dataset ../dataset --out DIR [--make-xmp]

Reads <dataset>/provenance/expected.csv (file, expected) with expected in
{c2pa_valid, c2pa_ai, invalid, xmp_ai, none}. Also scans <dataset>/ai_edits, platform and originals
as real-world checks (AI files should declare it; camera originals and WhatsApp copies should not).

--make-xmp creates any `*xmp_synthetic*` file that expected.csv lists but that does not exist:
a copy of a stripped image carrying an XMP packet with IPTC DigitalSourceType =
trainedAlgorithmicMedia. They are written to OUT/generated/, never into the dataset.
"""
import argparse
import csv
import io
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

XMP_PACKET = (
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>'
    '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    '<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
    'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/>'
    '</rdf:RDF></x:xmpmeta><?xpacket end="w"?>'
).encode("utf-8")


def predict(raw: bytes) -> dict:
    """What the system reports for one file, as the expected-label vocabulary plus detail."""
    from app import ingestion
    from app.gate.origin import check_origin

    out = {"decodable": True, "decode_error": ""}
    try:
        ingestion.normalize(raw)
    except Exception as e:
        out.update(decodable=False, decode_error=str(e))
    o = check_origin(raw)
    c = o.c2pa or {}
    state = (c.get("validation_state") or "").lower()
    out.update(c2pa_found=bool(c.get("found")), c2pa_state=c.get("validation_state"), c2pa_error=c.get("error", ""),
               c2pa_verdict=c.get("verdict"), c2pa_codes=";".join(c.get("failure_codes") or []),
               c2pa_generator=c.get("claim_generator"), c2pa_source_types=";".join(c.get("digital_source_types") or []),
               ai_declared=o.ai_generated_declared, details=" | ".join(o.details), notes=" | ".join(o.notes))
    if c.get("found") and c.get("verdict") == "valid":
        label = "c2pa_ai" if c.get("ai_declared") else "c2pa_valid"
    elif c.get("found") and c.get("verdict") == "credential_invalid":
        label = "credential_invalid"
    elif c.get("found") or (c.get("error") and "ManifestNotFound" not in c.get("error", "")):
        label = "invalid"
    elif any("DigitalSourceType" in d for d in o.details) and o.ai_generated_declared:
        label = "xmp_ai"
    else:
        label = "none"
    out["predicted"] = label
    return out


def make_xmp(name, prov_dir, gen_dir):
    """Build a missing xmp_synthetic file from the first stripped JPEG (deterministic)."""
    from PIL import Image
    src = sorted(f for f in os.listdir(prov_dir) if "c2pa_stripped" in f)
    if not src:
        return None
    os.makedirs(gen_dir, exist_ok=True)
    with Image.open(os.path.join(prov_dir, src[0])) as im:
        buf = io.BytesIO()
        im.convert("RGB").save(buf, "JPEG", quality=92, xmp=XMP_PACKET)
    path = os.path.join(gen_dir, name)
    open(path, "wb").write(buf.getvalue())
    return path


def label_matches(expected, predicted):
    # a valid manifest that additionally declares AI is still a valid manifest
    return expected == predicted or (expected == "c2pa_valid" and predicted == "c2pa_ai")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--make-xmp", action="store_true")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    prov = os.path.join(args.dataset, "provenance")
    gen = os.path.join(args.out, "generated")

    rows = []
    with open(os.path.join(prov, "expected.csv"), newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            path = os.path.join(prov, r["file"])
            source = "dataset"
            if not os.path.exists(path):
                path = os.path.join(gen, r["file"])
                if not os.path.exists(path):
                    if args.make_xmp and "xmp_synthetic" in r["file"]:
                        path = make_xmp(r["file"], prov, gen)
                    else:
                        path = None
                source = "generated" if path else "missing"
            rec = {"set": "provenance", "file": r["file"], "expected": r["expected"], "source": source}
            if path:
                rec.update(predict(open(path, "rb").read()))
            rows.append(rec)

    # real-world sets
    for folder, expect in (("ai_edits", "ai_declared"), ("platform", "none"), ("originals", "none")):
        d = os.path.join(args.dataset, folder)
        for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if os.path.splitext(f)[1].lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                continue
            rows.append({"set": folder, "file": f, "expected": expect, "source": "dataset",
                         **predict(open(os.path.join(d, f), "rb").read())})

    keys = ["set", "file", "expected", "predicted", "source", "decodable", "c2pa_found", "c2pa_state", "c2pa_verdict",
            "c2pa_codes", "c2pa_error",
            "c2pa_generator", "c2pa_source_types", "ai_declared", "details", "notes", "decode_error"]
    with open(os.path.join(args.out, "provenance_per_file.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    md = ["# Provenance / origin evaluation", ""]
    lab = [r for r in rows if r["set"] == "provenance" and r.get("predicted")]
    missing = [r["file"] for r in rows if r["set"] == "provenance" and r["source"] == "missing"]
    gen_n = sum(r["source"] == "generated" for r in rows if r["set"] == "provenance")
    md += [f"Labelled set: {len(lab)} files scored ({gen_n} generated xmp_synthetic files; {len(missing)} listed but missing).", ""]
    conf = defaultdict(Counter)
    for r in lab:
        conf[r["expected"]][r["predicted"]] += 1
    labels = ["c2pa_valid", "c2pa_ai", "credential_invalid", "invalid", "xmp_ai", "none"]
    md += ["| expected \\ predicted | " + " | ".join(labels) + " | correct |", "|---|" + "---|" * (len(labels) + 1)]
    for e in sorted(conf):
        n = sum(conf[e].values())
        ok = sum(v for p, v in conf[e].items() if label_matches(e, p))
        md.append(f"| {e} | " + " | ".join(str(conf[e][p]) for p in labels) + f" | {ok}/{n} |")
    md.append("")
    states = Counter((r["expected"], r.get("c2pa_verdict"), r.get("c2pa_codes"), r.get("decodable")) for r in lab)
    md += ["C2PA verdicts seen (expected, verdict, failure codes, image decodable):", ""] + [f"- {k}: {v}" for k, v in states.most_common()] + [
        "", "`signingCredential.untrusted` is always present (no trust list configured) and is not counted as a failure; "
        "`credential_invalid` means the manifest is intact but its signing certificate is invalid or expired.", ""]

    for folder, title in (("ai_edits", "Gemini AI edits (should declare AI)"), ("platform", "WhatsApp copies"),
                          ("originals", "Originals")):
        rs = [r for r in rows if r["set"] == folder]
        if not rs:
            continue
        md += [f"## {title}: {len(rs)} files", "",
               f"- C2PA manifest found: {sum(bool(r['c2pa_found']) for r in rs)}  (states: {dict(Counter(r['c2pa_state'] for r in rs if r['c2pa_found']))})",
               f"- AI generation declared (C2PA or XMP): {sum(r['ai_declared'] is True for r in rs)}",
               f"- any provenance reported: {sum(r['details'] != 'no provenance metadata found' for r in rs)}",
               f"- generators: {dict(Counter(r['c2pa_generator'] for r in rs if r['c2pa_generator']).most_common(3))}", ""]
    open(os.path.join(args.out, "provenance_summary.md"), "w", encoding="utf-8").write("\n".join(md))
    print("\n".join(md))


if __name__ == "__main__":
    main()
