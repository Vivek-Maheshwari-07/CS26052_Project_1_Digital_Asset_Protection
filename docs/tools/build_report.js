const fs = require("fs");
const D = require("docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, LevelFormat, HeadingLevel, Footer, PageNumber } = D;

const FONT = "Calibri";
const INK = "1B2430", BRAND = "5B3FD1", MUTED = "5A6672", LINE = "C9D1DA", SOFT = "F2EFFC", AMBER = "FFF4DC", GREEN = "E6F4EC";
const SZ = 20; // 10 pt body
const W = 10800; // content width: 12240 - 2*720

const run = (t, o = {}) => new TextRun({ text: t, font: FONT, size: SZ, color: INK, ...o });
const rich = (parts) => parts.map((p) => (typeof p === "string" ? run(p) : run(p.t, { bold: p.b, italics: p.i, color: p.c })));
const P = (parts, o = {}) => new Paragraph({ spacing: { after: 70, line: 245 }, ...o, children: rich(Array.isArray(parts) ? parts : [parts]) });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 60 }, keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND, space: 1 } },
  children: [new TextRun({ text: t, font: FONT, size: 25, bold: true, color: BRAND })] });
const B = (parts) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 35, line: 240 }, children: rich(Array.isArray(parts) ? parts : [parts]) });

const bd = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
function table(widths, rows, o = {}) {
  const fs_ = o.size || 16;
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0, cantSplit: true,
      children: r.map((c, ci) => {
        const head = ri === 0;
        const fill = head ? BRAND : (o.fills && o.fills[ri] && o.fills[ri][ci]) || (ri % 2 === 0 ? "F8F9FB" : "FFFFFF");
        const parts = typeof c === "string" ? [{ t: c, b: head || (ci === 0 && o.boldFirst) }] : c;
        return new TableCell({
          width: { size: widths[ci], type: WidthType.DXA }, borders,
          shading: { type: ShadingType.CLEAR, fill, color: "auto" },
          margins: { top: 35, bottom: 35, left: 70, right: 70 },
          children: [new Paragraph({ spacing: { after: 0, line: 220 }, children: parts.map((p) => new TextRun({ text: p.t, font: FONT, size: fs_, bold: p.b, italics: p.i, color: head ? "FFFFFF" : (p.c || INK) })) })],
        });
      }),
    })),
  });
}
const gap = (n = 60) => new Paragraph({ spacing: { after: n }, children: [] });

const kids = [];

// ---------- Title block
kids.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "Digital Asset Provenance", font: FONT, size: 40, bold: true, color: INK })] }));
kids.push(new Paragraph({ spacing: { after: 90 }, children: [new TextRun({ text: "Project report: purpose, evolution, tests and honest limits of the Phase 1 system", font: FONT, size: 22, color: MUTED })] }));

// ---------- 1 Purpose
kids.push(H1("1. Purpose and the problem"));
kids.push(P(["A creator who publishes an image has no cheap way to prove they made it first, or to find altered copies of it. Cropping, filtering, recompression, screenshots and AI re-edits defeat exact-match tools, and a bare \"85% similar\" score is not something a person can put in a takedown request. The project therefore does two jobs: ",
  { t: "register", b: true }, " an original (fingerprint it, chain it, timestamp it, issue a certificate) and ",
  { t: "check", b: true }, " a suspected copy against the owner's own works, returning a graded verdict with visual evidence a human can verify. Stated goal: ",
  { t: "evidence a person can check, not a black-box score", i: true }, ". The platform is FastAPI + MongoDB with a React front end; all measurements below were taken on a CPU-only laptop."]));

// ---------- 2 First draft
kids.push(H1("2. First draft: perceptual hash + CLIP fusion"));
kids.push(P(["The proposal combined a 64-bit pHash with an OpenCLIP ViT-B/32 embedding, fused by logistic regression, a SHA-256 hash chain, OpenTimestamps anchoring and a PDF certificate. It was evaluated on 40 photos x 21 synthetic edits (840 copies, 32,760 unrelated pairs, 5-fold cross-validation grouped by original)."]));
kids.push(table([2900, 1100, 1500, 1500, 3800], [
  ["Method (first draft)", "AUC", "TPR @ 1% FPR", "TPR @ 0.1% FPR", "Where it fails"],
  ["pHash alone", "0.903", "72.9%", "65.7%", "Horizontal flip 0%, 40% crop 10%, 15 degree rotation 10%"],
  ["CLIP embedding alone", "0.999", "99.3%", "92.3%", "Matches shared scene, not shared content"],
  ["Logistic fusion (deployed)", "0.999", "99.4%", "89.6%", "Easiest real case 0.0001 below the 'likely' cut-off"],
], { boldFirst: true }));
kids.push(gap(50));
kids.push(P([{ t: "What the first draft got wrong. ", b: true }, "On one real case (a toddler photo and four edited versions) the score ranked a real photo with an older child added (0.966) above a genuinely AI-edited copy (0.797), and a heavy AI edit scored 0.005. The synthetic benchmark was optimistic: easy negatives, simulated rather than generative edits, 40 photos, one real original. Holistic scores cannot say ",
  { t: "which region", i: true }, " changed or whether two images are the same photograph or two shots of the same scene. Five remedies were tried on that case and rejected (pad-to-square CLIP, multi-crop embeddings, extra classical hashes, face-count signal, tile-grid pHash) because none separated the cases."]));

// ---------- 3 Chronology
kids.push(H1("3. Challenges and changes, in order"));
kids.push(table([400, 2900, 3700, 3800], [
  ["#", "Challenge (found by testing)", "Change adopted", "Evidence it worked"],
  ["1", "Scores confuse same scene with same content; no localisation", "Added a verification gate after retrieval: SIFT + MAGSAC homography, aligned pixel comparison, graded verdict (Tier 1 evidence, Tier 2, Related lead) with evidence images", "Gate evidence fires on 0 of 20 same-scene siblings in the final run; classic strict score fired on 70%"],
  ["2", "Retrieval by CLIP alone missed rotated / mirrored / cropped queries", "DINOv2 added; query embedded in 3 orientations; 5 crop vectors per work; union of top-k from both models", "Retrieved in top-k: 99.7% of 1,200 scripted edits, 100% of copies and WhatsApp"],
  ["3", "Flat art, small crops and screens gave too few SIFT features; whole-image copies of flat art failed", "Containment coverage test for crops; low-feature relaxed mode; ECC whole-image alignment fallback", "Failing crops/screens Tier 1 0 -> 13 of 49; 21 of 21 controls unchanged"],
  ["4", "Brightness, colour, grayscale and tone edits inflated pixel residual", "Colour-matrix + tone-curve photometric normalisation, saturated pixels excluded, luminance mode for grayscale, informative-pixel metrics", "Grayscale 100% Tier 1; JPEG q30 100%"],
  ["5", "Dataset audit found 2 mislabels, 1 duplicate, 4 oversize (~200 MP) originals", "Label overrides and aliases (documented), oversize files quarantined (48 edits dropped)", "Re-scored without those artefacts; recorded in label_fixes_applied.md"],
  ["6", "Batch 1 (786 images) produced 1 false Tier 1: two handheld shots 7 s apart passed as evidence", "Tightened median-residual limit to 4; second Tier 1 route with stricter side conditions", "False evidence 1 -> 0 of 70; Tier 1 on edits rose with the second route"],
  ["7", "Latency ~4.2 s median; 8 candidates per check", "k=3, shared query features, candidates run concurrently (Option A on 151 images)", "Median 4.00 -> 3.59 s, candidates 8 -> 5, no loss of controls"],
  ["8", "Product requirements: isolated users, live explanation, certificate", "Own-works-only checks, job-based live pipeline view, six-layer fingerprint stack on certificate page 2, landing page, Discover feed", "End-to-end test: register, 2-page PDF, check, evidence report all passed; 110 automated tests pass"],
], { size: 15 }));

kids.push(gap(50));
kids.push(P([{ t: "How the headline numbers moved across runs ", b: true }, "(same pipeline family; each row is a stored run in eval/results_gate):"]));
kids.push(table([2600, 1500, 1700, 1800, 3200], [
  ["Run", "Suspects", "Tier 1 on edits", "False evidence", "Note"],
  ["Batch 1 (first full pass)", "786", "78.8% scripted, 100% copies and WhatsApp", "1 of 70", "Registry 713 works; scripted edits sampled at ~half"],
  ["Option A (new settings, hard subset)", "151", "Failing crops/screens 0 -> 13 of 49; controls 21 of 21", "1 -> 0", "Median 4.00 -> 3.59 s, candidates 8 -> 5"],
  ["Final (all settings frozen)", "1,399", "86.9% all positives; 86.5% scripted", "0 of 70", "Held-out 30% split 85.6%; median 4.3 s"],
], { boldFirst: true, size: 16 }));
kids.push(gap(30));
kids.push(P(["The later latency (4.3 s) is slightly above Option A (3.59 s) because Option A used a hard subset with fewer candidates, not because the pipeline slowed; both numbers are reported rather than the better one."]));

// ---------- 4 Final system
kids.push(H1("4. Phase 1 implementation (final)"));
kids.push(P([{ t: "Register. ", b: true }, "Upload an original; the file is decoded (EXIF orientation, transparency on white), fingerprinted six ways (file SHA-256, pHash, CLIP, DINOv2, SIFT digest, registry entry hash), appended to the SHA-256 hash chain and queued for Bitcoin anchoring via OpenTimestamps. A near-duplicate of another creator's work is refused; the certificate lists every layer and a composite fingerprint. ",
  { t: "Check. ", b: true }, "A suspected copy is compared only with the caller's own works. Stages: G0 normalise, G1 retrieve (CLIP + DINOv2), G2 verify (SIFT + MAGSAC, flips, coverage and reprojection guards, ECC fallback), G3 dense (warp, refine, photometric normalisation, residual, changed-pixel fraction, optical flow, fine-detail correlation), G4 classify, G5 evidence images (aligned overlay, difference heat-map, changed-region mask, match lines). An origin module reads C2PA manifests and IPTC AI markers. ",
  { t: "Live view. ", b: true }, "While either job runs, the page shows each stage on the user's own photo (pixel mosaic and 64-bit hash, embeddings, retrieved works, real SIFT matches, residual gauges), which also covers the ~4 s wait."]));
kids.push(P([{ t: "Grades. ", b: true }, "Tier 1 = evidence of copying (low residual, few changed pixels, matching fine detail). Tier 2 and Tier 3 run in shadow and are reported as leads. A \"Related image\" is explicitly a lead needing human review, never proof."]));

kids.push(table([1500, 4300, 5000], [
  ["Stage", "What it does", "Failure it exists to prevent (found in testing)"],
  ["G0 normalise", "EXIF rotation, RGB, transparency on white, trims flat borders, size guard", "Screenshot frames and alpha PNGs hashed differently from their sources"],
  ["G1 retrieve", "CLIP + DINOv2 whole-image and 5 crop vectors; 3 query orientations; owner filter", "Rotated, mirrored and cropped copies missing from the candidate list"],
  ["G2 verify", "SIFT + MAGSAC homography, mirrored mode, spread / coverage / reprojection guards, ECC fallback", "Repeated patterns and look-alikes passing as matches; flat art with no keypoints"],
  ["G3 dense", "Warp, refine, colour and tone normalisation, residual, changed fraction, flow, fine-detail correlation", "Colour edits inflating residual; blank canvas matching trivially"],
  ["G4 classify", "Two Tier 1 routes plus shadow Tier 2 / 3; falls through to a lead", "Over-claiming: a lead must never read as proof"],
  ["G5 evidence", "Aligned overlay, difference heat-map, changed-region mask, match lines", "A bare number nobody can check"],
], { boldFirst: true, size: 16 }));
kids.push(gap(40));

// ---------- 5 Evidence
kids.push(H1("5. Claims and the tests behind them"));
kids.push(P(["Final run: 1,399 suspects against a 713-work registry (100 originals + 613 distractors) with 1,200 scripted edits (12 types x 100 originals), 13 byte-level copies, 41 real WhatsApp round-trips, 75 Gemini edits, hard-negative siblings and 50 unrelated images. Percentages are over positives of that relation."]));
const g = GREEN, a = AMBER;
kids.push(table([3700, 1500, 5600], [
  ["Claim", "Result", "Backing and caveat"],
  ["Altered copies receive pixel-level evidence", "86.9% (1,254)", "Scripted 86.5%, copies 92.3%, WhatsApp 97.6%. Held-out 30% of originals: 85.6% (dev 86.9%)"],
  ["A claim of some grade is made for the copy", "95.6%", "Includes leads that need human review; retrieval 99.7%"],
  ["Look-alikes are not called evidence", "0 of 70", "95% upper bound 4.2% (siblings alone 13.9%). 9 of 20 siblings get a lead, by design"],
  ["Unrelated images produce no claim", "0 of 50", "Upper bound 5.8%"],
  ["Beats classic scores at similar strictness", "86.8% vs 72.6%", "Classic fused score at its strict cut-off also fires on 70% of hard negatives; loosened, it fires on 100%"],
  ["Median check ~4 s on CPU", "4.3 s (p95 8.7)", "Cold model load adds ~30 s once; now warmed at startup (not re-timed)"],
  ["Provenance metadata is read correctly", "see caveat", "Tampered 10/10, no-metadata 10/10, XMP AI marker 10/10, 75/75 Gemini edits declare AI. C2PA valid files: 5/10 classed exactly (signing trust list not configured)"],
], { fills: { 1: [g, g, g], 2: [g, g, g], 3: [g, g, g], 4: [g, g, g], 5: [g, g, g], 6: [g, g, g], 7: [a, a, a] }, size: 15 }));
kids.push(gap(40));
kids.push(P([{ t: "Per edit (Tier 1): ", b: true }, "jpeg_q30, grayscale, hflip, byte-identical 100%; resize_50 98%; crop_50 96%; rotate_90 95%; screenshot frame 95%; rotate_180 90%; crop_30 90%; jpeg_q10 87%; ",
  { t: "crop_10 62%; Gaussian blur 25%", b: true, c: "9A3412" }, " (blur is mostly graded Tier 2, a lead). Raw logs, per-image CSVs and the failure list are in eval/results_gate/20261011_final."]));

kids.push(P([{ t: "Method. ", b: true }, "A registry of 713 works (100 originals + 613 distractors) is rebuilt in an in-memory database; every suspect is run through the real gate and logged to a resumable file. Positives are split 70/30 by original so no original appears on both sides. Confidence bounds are Clopper-Pearson. Labels were audited first (2 mislabels, 1 duplicate corrected through override files). Threshold search uses grouped 5-fold cross-validation, so a threshold is never scored on the originals it was fitted on."]));
kids.push(P([{ t: "Dataset: ", b: true }, "100 originals across 18 categories (heavy art, illustration, logos, alpha-transparent, white background, night/low-light photos, portraits, architecture, documents and more); 1,200 scripted edits; 41 real WhatsApp round-trips; 25 each of light / medium / heavy Gemini edits; 20 same-template siblings; 50 unrelated; 613 distractor images."]));
kids.push(table([2600, 800, 1100, 1100, 5200], [
  ["Edit type", "n", "Tier 1", "Any claim", "Why the rest missed"],
  ["blur_gaussian", "100", "25.0%", "98.0%", "73 graded Tier 2 (lead): fine-detail agreement lost"],
  ["crop_10", "100", "62.0%", "65.0%", "22 too few matches, 8 insufficient coverage"],
  ["jpeg_q10 / rotate_180", "100 each", "87% / 90%", "100%", "Graded Tier 2 (heavy compression, border effects)"],
  ["crop_30 / crop_50", "100 each", "90% / 96%", "91% / 97%", "A few with too little coverage"],
  ["screenshot_frame / rotate_90", "100 each", "95% / 95%", "96% / 99%", "Coverage; one rotated query not retrieved"],
  ["resize_50 / whatsapp (41)", "100 / 41", "98% / 97.6%", "99% / 100%", "One Tier 2 each"],
  ["jpeg_q30, grayscale, hflip, identical re-upload", "100 / 100 / 100 / 12", "100%", "100%", "None"],
], { boldFirst: true, size: 16 }));
kids.push(gap(40));
kids.push(table([2600, 1300, 1700, 1500, 3700], [
  ["AI-edited copies", "Retrieved", "Evidence claim", "Lead", "Reading"],
  ["Light (n=25)", "100%", "72%", "28%", "Same pose and scene; edits are local"],
  ["Medium (n=25)", "88%", "0%", "40%", "A lead only; 60% receive no claim"],
  ["Heavy (n=25)", "44%", "0%", "0%", "Expected: no pixel method can link a regenerated image"],
], { boldFirst: true, size: 16 }));
kids.push(gap(40));
kids.push(P([{ t: "Latency (median / p95, seconds): ", b: true }, "retrieve 1.25 / 2.8; SIFT verification 3.8 / 10.7 (summed over candidates); dense comparison 1.8 / 4.2; candidates wall-clock 2.6 / 5.7; total 4.3 / 8.7 (worst 23.8). Median 4 candidates verified per check, maximum 6. This is CPU-only on a 7 GB laptop; the live view is designed to make this wait informative, not to hide it."]));
kids.push(P([{ t: "Provenance metadata (separate test, 40 labelled files): ", b: true }, "tampered manifests 10/10, no metadata 10/10, XMP AI marker 10/10; genuine C2PA files 5/10 exactly classified (the rest are flagged because no trust list is configured). Of 75 Gemini edits, all 75 declared AI generation; of 49 WhatsApp copies, none retained any provenance. The practical reading: declared provenance is strong when present and absent exactly when copies travel through messaging apps."]));
kids.push(P([{ t: "What we do not claim. ", b: true }, "We do not claim authorship (only first registration and its timestamp), detection of heavy AI regeneration, a guaranteed zero false-positive rate, or generalisation beyond this dataset. A Tier 1 result says the aligned pixels agree; it does not say who copied whom."]));

kids.push(P([{ t: "Automated and manual tests. ", b: true }, "110 offline tests pass (4 model-weight tests deselected by default): API isolation between users, registration and duplicate rules, hash-chain integrity, the gate stages and classifier thresholds, robustness cases, job progress events, own-works-only checks, Discover feed, 2-page certificate and fingerprint stack. A live browser run registered a work, produced the 2-page certificate and checked a cropped, recompressed copy through to the evidence page. Evaluation scripts are separate from the unit tests so the numbers above can be re-derived."]));
kids.push(H1("6. Boast audit: what is proven and what is not"));
kids.push(table([3900, 1500, 5400], [
  ["Statement", "Verdict", "Basis"],
  ["Finds most altered copies and shows evidence", "Proven on this set", "86.9% Tier 1, 95.6% any claim on 1,254 positives; held-out split 85.6%"],
  ["Never calls look-alikes evidence", "Supported, small sample", "0 of 70, but upper bound 4.2%; 3 of 70 appeared in cross-validated threshold search"],
  ["Beats the original CLIP + pHash design", "Proven for evidence quality", "Classic strict score fires on 70% of hard negatives; gate 0%. Classic score still has higher recall at its loose setting (95.1%) with 100% false fires"],
  ["Handles WhatsApp and screenshots", "Proven", "97.6% (41 real round-trips); screenshot frame 95%"],
  ["Handles AI edits", "Partly", "Light 72%; medium lead only; heavy none"],
  ["Real-time (about 4 s)", "Proven on CPU", "4.3 s median; p95 8.7 s; slower tail on large images"],
  ["Safe with multiple users", "Tested, not stress-tested", "Isolation tests and own-works-only retrieval; no load test"],
  ["Works at scale", "Not proven", "713 works only"],
], { fills: { 1: [GREEN, GREEN, GREEN], 2: [GREEN, AMBER, AMBER], 3: [GREEN, GREEN, GREEN], 4: [GREEN, GREEN, GREEN], 5: [AMBER, AMBER, AMBER], 6: [GREEN, GREEN, GREEN], 7: [AMBER, AMBER, AMBER], 8: ["FBE3E0", "FBE3E0", "FBE3E0"] }, size: 16, boldFirst: true }));
kids.push(gap(30));
// ---------- 6 Gaps
kids.push(H1("7. Honest gaps and drawbacks"));
kids.push(B([{ t: "Blur and small crops. ", b: true }, "Blurred copies reach Tier 1 only 25% of the time (any claim 98%); 10% crops 62% (any claim 65%). Sparse features and loss of fine detail are the cause."]));
kids.push(B([{ t: "AI edits. ", b: true }, "Light edits: 72% evidence; medium: 0% evidence, 40% lead; heavy: retrieved 44%, no claim. No pixel method can link a regenerated image. Only declared provenance (C2PA/XMP) helps, and WhatsApp stripped all of it (0 of 49)."]));
kids.push(B([{ t: "Tuned on the data it is scored on. ", b: true }, "Thresholds were fitted with this dataset in view; the 30% split is by original but is not an untouched blind set. Cross-validated threshold search reached 89.2% recall at 3 of 70 false Tier 1, so the deployed stricter setting trades recall for zero false evidence. \"0 of 70\" is a small sample (upper bound 4.2%)."]));
kids.push(B([{ t: "Near-identical captures. ", b: true }, "Two frames from a locked-off tripod differ only by sensor noise and can look like a copy; the noise-correlation feature separates them on the data (positives 0.87, negatives 0.00 median) but is logged, not yet used to grade."]));
kids.push(B([{ t: "Wrong-work evidence. ", b: true }, "0.9% of scripted-edit copies drew an evidence claim on a different work than the true original; these cases were not individually investigated."]));
kids.push(B([{ t: "Scale and realism. ", b: true }, "Registry of 713 works with an in-memory index; distractors are placeholder content; edits are scripted, with a real-world sample only for WhatsApp and Gemini. Re-photographed screens/prints and non-rigid warps are not modelled. Certificates prove registration time, not authorship."]));
kids.push(B([{ t: "Engineering. ", b: true }, "Jobs are in memory (lost on restart); the Discover feed is temporary; the frontend was verified in a manual end-to-end run, not an automated browser suite. A registration race (double click) was found and fixed in the UI only; the server does not yet reject simultaneous duplicate registrations."]));

// ---------- 7 Future
kids.push(H1("8. Future prospects"));
kids.push(B("Learned matcher or deblur-aware features as a fallback for blur and flat art, kept only if it beats the current gate in an ablation."));
kids.push(B("Use the noise-correlation signal to grade near-identical captures; calibrate Tier 2 and Tier 3 from shadow to active on a truly blind set."));
kids.push(B("Scale to 5,000+ works with an approximate-nearest-neighbour index; persistent job store; server-side duplicate-registration lock; browser regression tests."));
kids.push(B("Evaluate on real generative editors and more platforms; add an AI-generation detector and watermark checks; configure a C2PA trust list."));
kids.push(B("Takedown-request workflow, browser extension, and public verification of anchored timestamps."));

kids.push(H1("9. Reproducing the results"));
kids.push(P(["From the backend folder: ", { t: "python -m eval.gate_eval --dataset ../dataset --out eval/results_gate/<run> --resume --reuse-registry --order priority --sweep", i: true }, " writes summary.md, per-image CSVs, failures.csv and the threshold sweep. Dataset rules are in docs/DATASET_SPEC.md; pipeline design in docs/GATE_PIPELINE.md; the earlier baseline in docs/PIPELINE_STATUS_REPORT.md; the 30-slide deck in docs/Digital_Asset_Provenance.pptx. The full test suite is run with pytest."]));

const doc = new Document({
  creator: "Digital Asset Provenance", title: "Digital Asset Provenance: project report",
  styles: { default: { document: { run: { font: FONT, size: SZ, color: INK } } },
    paragraphStyles: [{ id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 25, bold: true, color: BRAND }, paragraph: { outlineLevel: 0 } }] },
  numbering: { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 200 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 700, bottom: 700, left: 720, right: 720 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Digital Asset Provenance  |  page ", font: FONT, size: 15, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: MUTED })] })] }) },
    children: kids,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(process.argv[2], b); console.log("ok"); });
