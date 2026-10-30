// Usage: node build_deck.js data.json out.pptx [interim.json]
//   data.json    numbers shown on the results slides
//   interim.json (optional) the earlier interim numbers; when given, the deck is in FINAL mode and the
//                reserved evidence page shows final vs interim. Without it that page stays reserved.
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const d = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const OUT = process.argv[3];
const interim = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4], "utf8")) : null;
const FINAL = !!interim;
const DATA_LABEL = FINAL ? "Final run: " + d.suspects.toLocaleString("en-US") + " test images" : "Interim results: batch 1, " + d.suspects + " test images";

const C = { ink: "0F1B2D", ink2: "1B2A41", teal: "0E7C86", tealLt: "D7EEF0", amber: "E8A33D", amberLt: "FBEFD9", red: "B83A3A", green: "2E8B57",
            bg: "F5F7FA", white: "FFFFFF", text: "1E2A3A", muted: "5B6B7F", line: "D9E0E8" };
const HEAD = "Cambria", BODY = "Calibri";
const f1 = (x) => (x === null || x === undefined ? "n/a" : (Math.round(x * 10) / 10).toFixed(1) + "%");
const f0 = (x) => (x === null || x === undefined ? "n/a" : Math.round(x) + "%");
const int = (x) => Number(x).toLocaleString("en-US");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.title = "Digital Asset Provenance: from a perceptual-hash baseline to a verified evidence pipeline";
const W = 13.33, H = 7.5, M = 0.6;
let n = 0;

function lightSlide(title, notes, opts) {
  const s = pres.addSlide(); n++;
  s.background = { color: C.white };
  s.addText(title, { x: M, y: 0.35, w: W - 2 * M, h: 1.0, fontFace: HEAD, fontSize: 28, bold: true, color: C.ink, margin: 0, valign: "top", isTextBox: true });
  s.addText("Digital Asset Provenance", { x: M, y: H - 0.45, w: 4, h: 0.3, fontFace: BODY, fontSize: 10, color: C.muted, margin: 0, isTextBox: true });
  if (opts && opts.results) s.addText(DATA_LABEL, { x: W - M - 6, y: H - 0.45, w: 6, h: 0.3, fontFace: BODY, fontSize: 10, color: C.muted, align: "right", margin: 0, isTextBox: true });
  if (notes) s.addNotes(notes);
  return s;
}
function card(s, x, y, w, h, fill) { s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill || C.bg }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08 }); }
function stat(s, x, y, w, big, label, color) {
  s.addText(big, { x, y, w, h: 0.95, fontFace: HEAD, fontSize: 44, bold: true, color: color || C.teal, margin: 0, isTextBox: true, valign: "top" });
  s.addText(label, { x, y: y + 0.95, w, h: 0.7, fontFace: BODY, fontSize: 14, color: C.muted, margin: 0, isTextBox: true, valign: "top" });
}
function bullets(s, items, x, y, w, h, size) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })),
    { x, y, w, h, fontFace: BODY, fontSize: size || 16, color: C.text, margin: 0, valign: "top", isTextBox: true });
}
function evidence(s, text) {
  s.addText("Evidence: " + text, { x: M, y: H - 0.85, w: W - 2 * M, h: 0.35, fontFace: BODY, fontSize: 11, italic: true, color: C.muted, margin: 0, isTextBox: true });
}
const hdr = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.ink } } });
const chartBase = (title) => ({ showTitle: !!title, title, titleFontFace: BODY, titleFontSize: 14, titleColor: C.muted,
  catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY, catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
  catAxisLabelColor: C.text, valAxisLabelColor: C.muted, valGridLine: { color: C.line, size: 0.5 }, catGridLine: { style: "none" },
  dataLabelFontFace: BODY, dataLabelFontSize: 11, dataLabelColor: C.text, legendFontFace: BODY, legendFontSize: 12, legendColor: C.text });
function section(title, sub) {
  const s = pres.addSlide(); n++; s.background = { color: C.ink2 };
  s.addText(title, { x: 0.9, y: 2.6, w: 11.5, h: 1.0, fontFace: HEAD, fontSize: 44, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText(sub, { x: 0.9, y: 3.7, w: 11, h: 0.9, fontFace: BODY, fontSize: 20, color: "BFD3E6", margin: 0, isTextBox: true });
}
const table = (s, rows, opt) => s.addTable(rows, Object.assign({ fontFace: BODY, fontSize: 13, color: C.text, border: { type: "solid", color: C.line, pt: 0.75 }, valign: "middle" }, opt));

// 1. Title ------------------------------------------------------------------------------------------
{
  const s = pres.addSlide(); n++; s.background = { color: C.ink };
  s.addText("Proving who made it first", { x: 0.9, y: 1.9, w: 11.5, h: 1.3, fontFace: HEAD, fontSize: 54, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText("From a perceptual-hash baseline to graded, checkable evidence of copying", { x: 0.9, y: 3.3, w: 10.8, h: 0.9, fontFace: BODY, fontSize: 24, color: "BFD3E6", margin: 0, isTextBox: true });
  s.addText("Digital Asset Provenance  |  one week of experiments, reviews and evaluations", { x: 0.9, y: 5.5, w: 11.5, h: 0.5, fontFace: BODY, fontSize: 16, color: "8FA6BD", margin: 0, isTextBox: true });
  s.addNotes("Opening: the system started as pHash + CLIP. This deck tells the evidence-backed story of how it became a verification pipeline.");
}

// A. Agenda
{
  const s = lightSlide("The story in four stages", "Each stage answers the question the previous one raised.");
  const st = [["1", "The proposal", "A registry and copy checker for independent creators, using two fingerprints"],
              ["2", "The first draft pipeline", "pHash + CLIP + learned fusion: excellent on a benchmark"],
              ["3", "Challenges and changes", "A real case, rejected fixes, measurement spikes and the verification gate"],
              ["4", "The final pipeline run", "A dataset built to break it, honest results and what is still open"]];
  st.forEach((x, i) => {
    const px = M + i * 3.05;
    card(s, px, 1.9, 2.8, 4.1, i === 3 ? C.tealLt : C.bg);
    s.addShape(pres.ShapeType.ellipse, { x: px + 0.3, y: 2.15, w: 0.75, h: 0.75, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(x[0], { x: px + 0.3, y: 2.15, w: 0.75, h: 0.75, fontFace: HEAD, fontSize: 26, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(x[1], { x: px + 0.3, y: 3.15, w: 2.3, h: 0.9, fontFace: HEAD, fontSize: 20, bold: true, color: C.ink, margin: 0, valign: "top", isTextBox: true });
    s.addText(x[2], { x: px + 0.3, y: 4.15, w: 2.3, h: 1.7, fontFace: BODY, fontSize: 14, color: C.text, margin: 0, valign: "top", isTextBox: true });
  });
}

section("Stage 1: The proposal", "What we set out to build, and what we knew could go wrong");

// 2. Problem ----------------------------------------------------------------------------------------
{
  const s = lightSlide("Creators cannot prove first authorship or catch altered copies", "Three gaps in existing tools.");
  const items = [["1", "Watermarks need the copier's cooperation", "They vanish the moment the image is cropped, re-saved or screenshotted."],
                 ["2", "Duplicate matching breaks on any edit", "Flips, crops, filters and recompression defeat simple hash comparison."],
                 ["3", "Similar is not the same", "Two photos of one scene look alike but are different works; a copy is not."]];
  items.forEach((it, i) => {
    const x = M + i * 4.1;
    card(s, x, 1.7, 3.8, 4.6);
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.35, y: 2.0, w: 0.8, h: 0.8, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(it[0], { x: x + 0.35, y: 2.0, w: 0.8, h: 0.8, fontFace: HEAD, fontSize: 26, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(it[1], { x: x + 0.35, y: 3.1, w: 3.1, h: 1.3, fontFace: HEAD, fontSize: 20, bold: true, color: C.ink, margin: 0, valign: "top", isTextBox: true });
    s.addText(it[2], { x: x + 0.35, y: 4.5, w: 3.1, h: 1.6, fontFace: BODY, fontSize: 15, color: C.muted, margin: 0, valign: "top", isTextBox: true });
  });
}

// 3. What we built ----------------------------------------------------------------------------------
{
  const s = lightSlide("The proposal: a registry plus a copy checker", "The four user-facing steps from the proposal and README.");
  const steps = [["Register", "Fingerprint the original, add it to a tamper-evident hash chain, timestamp it in Bitcoin."],
                 ["Check", "Upload a suspected copy; search the whole registry for candidates."],
                 ["Evidence", "Aligned overlay, difference heatmap and a graded verdict, not just a score."],
                 ["Certificate", "A PDF with a QR code to a public page anyone can verify."]];
  steps.forEach((st, i) => {
    const x = M + i * 3.05;
    card(s, x, 1.9, 2.8, 3.6, i === 2 ? C.tealLt : C.bg);
    s.addText(String(i + 1), { x: x + 0.3, y: 2.15, w: 0.6, h: 0.6, fontFace: HEAD, fontSize: 30, bold: true, color: C.teal, margin: 0, isTextBox: true });
    s.addText(st[0], { x: x + 0.3, y: 2.85, w: 2.3, h: 0.5, fontFace: HEAD, fontSize: 22, bold: true, color: C.ink, margin: 0, isTextBox: true });
    s.addText(st[1], { x: x + 0.3, y: 3.4, w: 2.3, h: 1.9, fontFace: BODY, fontSize: 14, color: C.text, margin: 0, valign: "top", isTextBox: true });
  });
  s.addText("Planned method: two fingerprints, a perceptual hash and a pretrained embedding, with a measured comparison of the two.", { x: M, y: 5.9, w: W - 2 * M, h: 0.6, fontFace: BODY, fontSize: 15, italic: true, color: C.muted, margin: 0, isTextBox: true });
  evidence(s, "project proposal; README.md");
}

// B. Proposal promises and risks
{
  const s = lightSlide("What the proposal promised, and the risks it named up front", "From the project proposal: expected outcome and challenges.");
  card(s, M, 1.6, 5.95, 4.9); card(s, M + 6.2, 1.6, 5.93, 4.9, C.amberLt);
  s.addText("Promised", { x: M + 0.3, y: 1.8, w: 5.3, h: 0.5, fontFace: HEAD, fontSize: 22, bold: true, color: C.ink, margin: 0, isTextBox: true });
  bullets(s, ["A working platform: register work, check suspected copies, see the evidence", "Detect cropped, filtered, recompressed and AI-edited copies", "Confidence-scored results, not a yes/no", "A tamper-evident, timestamped registry and a certificate", "A measured comparison: embeddings vs classical hashing, the basis of the paper"], M + 0.3, 2.4, 5.4, 4.0, 15);
  s.addText("Risks named in advance", { x: M + 6.5, y: 1.8, w: 5.3, h: 0.5, fontFace: HEAD, fontSize: 22, bold: true, color: C.ink, margin: 0, isTextBox: true });
  bullets(s, ["Sensitivity tuning: catch real theft without flagging look-alikes", "Test-set construction: a fair, large set of edited and AI-edited images", "Performance at scale as the registry grows", "A learning curve in hashing, embeddings and evaluation method"], M + 6.5, 2.4, 5.3, 4.0, 15);
  evidence(s, "project proposal");
}

section("Stage 2: The first draft pipeline", "Two fingerprints and a learned fusion, evaluated on a benchmark");

// C. First draft architecture
{
  const s = lightSlide("The first draft pipeline: two fingerprints and a learned fusion", "As built before any verification gate existed.");
  const st = [["Ingest", "Decode, EXIF orientation, RGB"], ["pHash", "64-bit DCT hash of the whole frame"], ["CLIP", "ViT-B/32, 512-d embedding"],
              ["Fusion", "Logistic regression over both similarities"], ["Verdict", "likely / possible / no match"]];
  st.forEach((x, i) => {
    const px = M + i * 2.48;
    s.addShape(pres.ShapeType.roundRect, { x: px, y: 1.8, w: 2.25, h: 2.1, fill: { color: i === 3 ? C.teal : C.ink2 }, line: { color: i === 3 ? C.teal : C.ink2 }, rectRadius: 0.08 });
    s.addText(x[0], { x: px + 0.2, y: 2.0, w: 1.9, h: 0.5, fontFace: HEAD, fontSize: 22, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText(x[1], { x: px + 0.2, y: 2.6, w: 1.9, h: 1.2, fontFace: BODY, fontSize: 14, color: "DCE6F0", margin: 0, valign: "top", isTextBox: true });
  });
  card(s, M, 4.3, 5.95, 2.2, C.tealLt);
  s.addText("Registry", { x: M + 0.3, y: 4.45, w: 5.3, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.ink, margin: 0, isTextBox: true });
  bullets(s, ["SHA-256 hash chain: each entry commits to the previous one", "OpenTimestamps anchoring in Bitcoin", "PDF certificate with a QR code"], M + 0.3, 4.95, 5.4, 1.5, 14);
  card(s, M + 6.2, 4.3, 5.93, 2.2);
  s.addText("The fusion rule", { x: M + 6.5, y: 4.45, w: 5.3, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.ink, margin: 0, isTextBox: true });
  s.addText("confidence = sigmoid(27.9 x embedding + 13.1 x pHash - 25.8)  likely at 0.996, possible at 0.27", { x: M + 6.5, y: 4.95, w: 5.4, h: 1.4, fontFace: "Courier New", fontSize: 13, color: C.text, margin: 0, valign: "top", isTextBox: true });
  evidence(s, "docs/PIPELINE_STATUS_REPORT.md section 3");
}

// 6. Baseline ---------------------------------------------------------------------------------------
{
  const s = lightSlide("The first draft looked excellent, on easy data", "Baseline evaluation: 40 Lorem Picsum photos, 21 programmatic edits, 840 copies, 32,760 unrelated pairs.");
  s.addChart(pres.charts.BAR, [{ name: "Detection rate at 1% false positives", labels: ["pHash", "CLIP embedding", "Old heuristic fusion", "Learned fusion (in use)"], values: [72.9, 99.3, 99.6, 99.4] }],
    Object.assign({ x: M, y: 1.5, w: 7.2, h: 4.9, barDir: "col", chartColors: [C.teal], showValue: true, dataLabelFormatCode: "0.0\"%\"", dataLabelPosition: "outEnd", valAxisMaxVal: 110, valAxisMinVal: 0,
      valAxisLabelFormatCode: "0\"%\"", showLegend: false }, chartBase("Detection rate at 1% false positives")));
  card(s, 8.1, 1.6, 4.65, 4.7);
  s.addText("What it showed and hid", { x: 8.35, y: 1.8, w: 4.2, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.ink, margin: 0, isTextBox: true });
  bullets(s, ["CLIP beats pHash on crops, flips and rotations (pHash: 0% on flips)", "Fusion AUC 0.9992", "But negatives were different landscapes, an easy test", "The \"AI\" edits were image filters, not generative output"], 8.35, 2.4, 4.2, 3.8, 14);
  evidence(s, "baseline robustness run (summary.md); docs/PIPELINE_STATUS_REPORT.md sections 5-6");
}

section("Stage 3: Challenges and changes", "A real case broke the benchmark result; measurement decided what to build");

// 7. Case study -------------------------------------------------------------------------------------
{
  const s = lightSlide("One real photo exposed two failures the benchmark could not", "Case study: toddler photo registered; four images checked against it.");
  s.addChart(pres.charts.BAR, [{ name: "Fused confidence", labels: ["Minimal AI edit", "Medium AI edit", "Heavy AI edit", "Real photo, child added"], values: [99.6, 79.7, 0.5, 96.6] }],
    Object.assign({ x: M, y: 1.5, w: 6.6, h: 4.9, barDir: "col", chartColors: [C.amber], showValue: true, dataLabelFormatCode: "0.0\"%\"", dataLabelPosition: "outEnd", valAxisMaxVal: 115, valAxisMinVal: 0,
      valAxisLabelFormatCode: "0\"%\"", showLegend: false }, chartBase("Old pipeline: fused confidence vs the original")));
  card(s, 7.5, 1.6, 5.25, 4.7);
  s.addText("The two failures", { x: 7.75, y: 1.8, w: 4.8, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.ink, margin: 0, isTextBox: true });
  bullets(s, ["Heavy AI edit scored 0.5%: undetected", "A different photo of the same scene (older child added) scored 96.6%, higher than a genuine AI derivative at 79.7%", "Scores reward shared background and pose, not shared content", "The easiest case sat 0.0001 below the \"likely\" threshold"], 7.75, 2.4, 4.75, 3.9, 14);
  evidence(s, "docs/PIPELINE_STATUS_REPORT.md section 6.3 (n = 1 per row: a diagnostic, not a benchmark)");
}

// 8. Rejected experiments ---------------------------------------------------------------------------
{
  const s = lightSlide("Five fixes we tried and rejected, so we did not build on them", "All on the case-study images; each is in the status report.");
  table(s, [[hdr("Idea"), hdr("What happened"), hdr("Decision")],
    ["Pad images to a square for CLIP", "True-match similarity collapsed (0.83 to 0.40)", "Rejected"],
    ["Embed 3 crops, take the max", "Neutral on copies, did not separate the sibling, 3x compute", "Rejected"],
    ["Add dHash / wHash / aHash", "wHash and aHash scored the sibling higher than pHash", "Rejected"],
    ["Count faces to detect added people", "4 faces found on a one-child image; useless for illustrations", "Rejected"],
    ["Tile-grid pHash", "No separation without first aligning the images", "Rejected"]],
    { x: M, y: 1.6, w: W - 2 * M, colW: [4.2, 6.0, 1.93], rowH: 0.78, fontSize: 15 });
  s.addText("Lesson: global scores cannot tell \"same scene\" from \"same content\". Aligning the images first can.", { x: M, y: 6.1, w: W - 2 * M, h: 0.5, fontFace: BODY, fontSize: 16, italic: true, color: C.teal, margin: 0, isTextBox: true });
  evidence(s, "docs/PIPELINE_STATUS_REPORT.md section 7");
}

// 9. Spikes -----------------------------------------------------------------------------------------
{
  const s = lightSlide("Measurement spikes decided what to build and what to drop", "Measurement only; trust the generated files, not chat summaries.");
  const cards = [["0.01 - 1.4 px", "leftover shift after aligning synthetic copies, against 7 to 38 px for real derivative pairs: alignment separates copies from look-alikes"],
                 ["0.911 vs 0.849", "DINOv2 ranks the AI edit above the sibling; CLIP does not (0.802 vs 0.813): keep both models"],
                 ["0 of 52", "real photos flagged by one AI-image detector; the other flagged all 52: both detectors failed, so none ships"]];
  cards.forEach((c, i) => {
    const x = M + i * 4.1;
    card(s, x, 1.7, 3.8, 3.7);
    s.addText(c[0], { x: x + 0.3, y: 1.9, w: 3.3, h: 0.8, fontFace: HEAD, fontSize: 28, bold: true, color: C.teal, margin: 0, isTextBox: true });
    s.addText(c[1], { x: x + 0.3, y: 2.8, w: 3.3, h: 2.5, fontFace: BODY, fontSize: 14, color: C.text, margin: 0, valign: "top", isTextBox: true });
  });
  bullets(s, ["Spike 1: 5 images, 29 pairs, with 14 synthetic controls; Spike 2: 52 jersey photos + 5 case images for the detectors", "Decision: align first (SIFT + MAGSAC), grade by pixel evidence, never use an ML detector as proof"], M, 5.65, W - 2 * M, 1.0, 14);
  evidence(s, "measurement spike runs (results.md, results.json)");
}

// 10. Gate built and reviewed -----------------------------------------------------------------------
{
  const s = lightSlide("The gate was built, then reviewed and tested until it worked", "Implementation, then a code review that found defects; each fixed and covered by tests.");
  table(s, [[hdr("Found in review and testing"), hdr("Result")],
    ["Alignment stage crashed on every image (missing import)", "Fixed; stage failures are now logged, never swallowed"],
    ["Valid crops, resizes and rotations rejected as inconsistent", "Replaced by a reprojection-fit guard"],
    ["Origin check reported a C2PA manifest on every image", "Now reads the manifest and its signature"],
    ["Evidence images used the wrong scale; refinement applied the wrong way", "Rebuilt in one consistent frame"],
    ["Phone photos with EXIF rotation compared unrotated", "One normaliser for every image"],
    ["Gate not connected to the app", "Wired into check, register and the evidence view"]],
    { x: M, y: 1.6, w: 8.3, colW: [4.7, 3.6], rowH: 0.72, fontSize: 13 });
  stat(s, 9.5, 1.7, 3.3, "29 to 102", "automated tests passing (offline, about 2 minutes)", C.teal);
  stat(s, 9.5, 3.6, 3.3, "15", "issues listed in the code review; each fixed or tracked", C.amber);
  evidence(s, "docs/GATE_PIPELINE.md; backend/tests/ (pytest); review findings in the project notes");
}

// 22. What testing changed --------------------------------------------------------------------------
{
  const s = lightSlide("What the evaluation changed in the pipeline", "Each row is a weakness the evaluation exposed, then measured after the fix.");
  table(s, [[hdr("Found by testing"), hdr("Change"), hdr("Measured effect")],
    ["Blank canvas matches trivially", "Measure only structured pixels", "No false evidence from flat backgrounds"],
    ["Transparent sprites compared on black vs reposts on white", "Alpha composited on white; transparent pixels ignored", "Sprite copies match reposts"],
    ["Near-perfect copies blocked by one edge-sensitive metric", "Two-route Tier 1 rule, tuned on dev split, checked on test", "Test recall 78.2% to 84.5%, 0 false on 20 negatives"],
    ["10% crops just under a coverage limit", "Containment coverage 0.5 to 0.4", "Failing crops and screens: 0 to 13 of 49 now Tier 1"],
    ["Too many candidates verified", "Retrieval depth 5 to 3", "8 to 5 candidates, about 10% faster"],
    ["Near-same-position second photo graded as evidence", "Typical-residual limit 8 to 4", "That pair is now a lead; 0 evidence claims on 70 negatives"]],
    { x: M, y: 1.5, w: W - 2 * M, colW: [4.4, 4.2, 3.53], fontSize: 13, rowH: 0.7 });
  evidence(s, "verification re-run and threshold sweep (sweep.md, label_fixes_applied.md)");
}

section("Stage 4: The final pipeline run", "A dataset built to break it, and an honest account of the results");

// 12. Architecture ----------------------------------------------------------------------------------
{
  const s = lightSlide("The verification gate: six stages from upload to evidence", "Each stage can fail loudly; failures are recorded.");
  const st = [["G0", "Normalise", "EXIF, trim borders, alpha on white"], ["G1", "Retrieve", "CLIP + DINOv2, 3 orientations, crop vectors"],
              ["G2", "Align", "SIFT + MAGSAC; flat-art fallback"], ["G3", "Compare", "Warp, photometric match, residual, flow"],
              ["G4", "Grade", "Tier 1 evidence / lead / none"], ["G5", "Evidence", "Overlay, heatmap, changed regions"]];
  st.forEach((x, i) => {
    const px = M + i * 2.02;
    s.addShape(pres.ShapeType.roundRect, { x: px, y: 1.8, w: 1.85, h: 2.9, fill: { color: i === 4 ? C.teal : C.ink2 }, line: { color: i === 4 ? C.teal : C.ink2 }, rectRadius: 0.08 });
    s.addText(x[0], { x: px + 0.15, y: 1.95, w: 1.5, h: 0.5, fontFace: HEAD, fontSize: 24, bold: true, color: C.amber, margin: 0, isTextBox: true });
    s.addText(x[1], { x: px + 0.15, y: 2.5, w: 1.6, h: 0.5, fontFace: HEAD, fontSize: 18, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText(x[2], { x: px + 0.15, y: 3.05, w: 1.6, h: 1.5, fontFace: BODY, fontSize: 13, color: "DCE6F0", margin: 0, valign: "top", isTextBox: true });
  });
  card(s, M, 5.0, W - 2 * M, 1.3, C.tealLt);
  s.addText([{ text: "In parallel: origin check. ", options: { bold: true } },
             { text: "Reads C2PA manifests and IPTC DigitalSourceType. Absence is reported as \"no provenance metadata found\", never as \"real\"." }],
    { x: M + 0.3, y: 5.1, w: W - 2 * M - 0.6, h: 1.1, fontFace: BODY, fontSize: 16, color: C.text, margin: 0, valign: "middle", isTextBox: true });
  evidence(s, "docs/GATE_PIPELINE.md");
}

// 13. Claims ----------------------------------------------------------------------------------------
{
  const s = lightSlide("What the system is allowed to claim", "Only evidence-grade findings may be presented as proof; leads always need a human.");
  table(s, [[hdr("Verdict"), hdr("Meaning"), hdr("How it is used")],
    ["Tier 1: pixel evidence", "Unchanged regions agree pixel for pixel after alignment", "Evidence grade: can block a duplicate registration, supports a takedown request"],
    ["Related image (lead)", "Credible alignment but pixels differ: edited, re-rendered or a second photo of the same scene", "Human review required; never presented as proof"],
    ["AI origin metadata", "A signed C2PA manifest or IPTC tag declares AI generation", "Reported as declared by the file; its absence proves nothing"],
    ["No claim", "No credible link to any registered work", "Honest limit: heavy AI regeneration ends here"]],
    { x: M, y: 1.6, w: W - 2 * M, colW: [3.0, 4.8, 4.33], fontSize: 15, rowH: [0.5, 1.0, 1.0, 1.0, 1.0] });
}

// 14. Dataset ---------------------------------------------------------------------------------------
{
  const s = lightSlide("Tested on a dataset built to break it", "Eight categories; labels were audited by the system itself.");
  const r = d.relations || {};
  const cards = [[int(100), "original works: illustration, flat art, sprites, phone photos, night shots, documents"],
                 [int(r.classical || 1200), "scripted edits: crops to 10%, rotations, JPEG q10, blur, grayscale, screenshot frames"],
                 [int((r.platform || 41) + (r.copy || 12)), "real WhatsApp round-trips and exact re-uploads"],
                 [int((r.ai_light || 25) * 3), "Gemini AI edits: light, medium, heavy"],
                 [int((r.sibling || 20) + (r.unrelated || 50)), "hard negatives and unrelated images that must not be flagged"],
                 [int(d.registry), "registered works, including near-duplicate distractors"]];
  cards.forEach((c, i) => {
    const x = M + (i % 3) * 4.1, y = 1.55 + (Math.floor(i / 3)) * 2.1;
    card(s, x, y, 3.8, 1.9);
    s.addText(c[0], { x: x + 0.3, y: y + 0.12, w: 3.2, h: 0.8, fontFace: HEAD, fontSize: 36, bold: true, color: C.teal, margin: 0, isTextBox: true });
    s.addText(c[1], { x: x + 0.3, y: y + 0.92, w: 3.3, h: 0.9, fontFace: BODY, fontSize: 13, color: C.text, margin: 0, valign: "top", isTextBox: true });
  });
  bullets(s, ["A held-out test split (30% of originals) was never used to choose thresholds", "Labels audited: the gate itself exposed 2 mislabelled files and 1 duplicate", "Results carry 95% upper bounds, not just point estimates"], M, 5.85, W - 2 * M, 1.0, 14);
  evidence(s, "docs/DATASET_SPEC.md; dataset review and label-fix files");
}

// 15. Headline --------------------------------------------------------------------------------------
{
  const cm = d.compare;
  const s = lightSlide("The gate catches as many copies, with far fewer false alarms", "Deployed operating points on identical test images.", { results: true });
  const labels = ["Detects altered copies", "Fires on same-scene siblings", "Fires on unrelated images"];
  s.addChart(pres.charts.BAR, [
    { name: "Classic score, strict", labels, values: [cm.classic_strict.positives, cm.classic_strict.siblings, cm.classic_strict.unrelated] },
    { name: "Classic score, loose", labels, values: [cm.classic_loose.positives, cm.classic_loose.siblings, cm.classic_loose.unrelated] },
    { name: "Gate: evidence claim", labels, values: [cm.gate_evidence.positives, cm.gate_evidence.siblings, cm.gate_evidence.unrelated] }],
    Object.assign({ x: M, y: 1.4, w: 8.2, h: 5.2, barDir: "col", barGrouping: "clustered", chartColors: ["9AA9BA", "5B6B7F", C.teal], showValue: true, dataLabelFormatCode: "0\"%\"", dataLabelPosition: "outEnd",
      valAxisMaxVal: 110, valAxisMinVal: 0, valAxisLabelFormatCode: "0\"%\"", showLegend: true, legendPos: "b" }, chartBase("Share of test images flagged (%)")));
  stat(s, 9.2, 1.6, 3.5, f1(d.positive_all.tier1), "of altered copies get pixel-level evidence", C.teal);
  stat(s, 9.2, 3.5, 3.5, d.negatives.false_evidence + " of " + d.negatives.n, "look-alikes wrongly called evidence (95% upper bound " + f1(d.negatives.upper95) + ")", C.amber);
  s.addText("The gate also reports a lead for " + f1(d.positive_all.any_claim) + " of copies in total.", { x: 9.2, y: 5.5, w: 3.6, h: 0.9, fontFace: BODY, fontSize: 14, italic: true, color: C.muted, margin: 0, valign: "top", isTextBox: true });
}

// 16. By edit ---------------------------------------------------------------------------------------
{
  const s = lightSlide("Per alteration: near-perfect except heavy blur and tiny crops", "Share of scripted edits graded Tier 1; any-claim in the second series.", { results: true });
  const e = Object.entries(d.by_edit).sort((a, b) => a[1].tier1 - b[1].tier1);
  s.addChart(pres.charts.BAR, [{ name: "Tier 1 (pixel evidence)", labels: e.map((x) => x[0]), values: e.map((x) => x[1].tier1) },
                               { name: "Any claim reported", labels: e.map((x) => x[0]), values: e.map((x) => x[1].any_claim) }],
    Object.assign({ x: M, y: 1.4, w: 8.4, h: 5.4, barDir: "bar", barGrouping: "clustered", chartColors: [C.teal, "B7C4D2"], showValue: false, valAxisMaxVal: 100, valAxisMinVal: 0, valAxisLabelFormatCode: "0\"%\"",
      showLegend: true, legendPos: "b" }, chartBase("")));
  card(s, 9.3, 1.6, 3.45, 5.0);
  s.addText("Reading the weak spots", { x: 9.55, y: 1.8, w: 3.0, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.ink, margin: 0, isTextBox: true });
  bullets(s, ["Blur removes the fine detail pixel evidence needs, so blurred copies become leads, still found", "10% crops often have too few matching features", "Most other edits are above 80%"], 9.55, 2.4, 3.0, 4.0, 14);
}

// 17. By category -----------------------------------------------------------------------------------
{
  const s = lightSlide("Flat vector art is the hardest category", "Illustration includes the sprite packs and flat vector art.", { results: true });
  const e = Object.entries(d.by_category_merged).sort((a, b) => a[1].tier1 - b[1].tier1);
  s.addChart(pres.charts.BAR, [{ name: "Tier 1 (pixel evidence)", labels: e.map((x) => x[0] + " (n=" + x[1].n + ")"), values: e.map((x) => x[1].tier1) }],
    Object.assign({ x: M, y: 1.4, w: 7.8, h: 5.4, barDir: "bar", chartColors: [C.teal], showValue: true, dataLabelFormatCode: "0\"%\"", dataLabelPosition: "outEnd", valAxisMaxVal: 110, valAxisMinVal: 0,
      valAxisLabelFormatCode: "0\"%\"", showLegend: false }, chartBase("Tier 1 rate by image category")));
  card(s, 8.8, 1.6, 3.95, 5.0);
  s.addText("Why flat art is harder", { x: 9.05, y: 1.8, w: 3.5, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.ink, margin: 0, isTextBox: true });
  bullets(s, ["Few corner features, so matching has less to hold on to", "Only edges carry information, so tiny sub-pixel shifts show as differences", "Built to help: a whole-image alignment fallback and a measure that ignores blank areas"], 9.05, 2.4, 3.5, 4.0, 14);
}

// 18. Platform + AI ---------------------------------------------------------------------------------
{
  const s = lightSlide("Real WhatsApp copies are all caught; AI edits split by how much changed", "WhatsApp recompresses and strips metadata.", { results: true });
  stat(s, M, 1.6, 3.6, f0(d.positive.platform ? d.positive.platform.tier1 : 100), "of " + (d.positive.platform ? d.positive.platform.n : 41) + " real WhatsApp round-trips graded Tier 1", C.teal);
  stat(s, M, 3.6, 3.6, f0(d.positive.copy ? d.positive.copy.tier1 : 100), "of exact re-uploads graded Tier 1", C.teal);
  const a = d.ai || {};
  const rows = [[hdr("AI edit strength"), hdr("Evidence"), hdr("Lead"), hdr("No claim"), hdr("Declares AI in metadata")]];
  [["Light (small local change)", "ai_light"], ["Medium (new background / style)", "ai_medium"], ["Heavy (only a reference)", "ai_heavy"]].forEach((p) => {
    if (a[p[1]]) rows.push([p[0], f0(a[p[1]].evidence), f0(a[p[1]].lead), f0(a[p[1]].none), f0(a[p[1]].declared_ai_by_metadata)]);
  });
  table(s, rows, { x: 4.9, y: 1.7, w: 7.85, colW: [3.05, 1.1, 1.0, 1.1, 1.6], fontSize: 14, rowH: 0.62 });
  bullets(s, ["Heavy regeneration cannot be linked pixel by pixel: an information limit, reported as no claim", "The Gemini files carry signed provenance, so metadata still flags them as AI-made (until stripped)"], 4.9, 4.7, 7.85, 1.8, 15);
}

// 19. Case study: false alarm -----------------------------------------------------------------------
{
  const s = lightSlide("A false alarm the evaluation caught, and what we did about it", "Two handheld photos 7 seconds apart; the camera barely moved.");
  s.addImage({ path: "case_evidence.png", x: M, y: 1.5, w: 7.6, h: 2.54 });
  s.addText("Left to right: aligned overlay, difference heatmap, changed regions", { x: M, y: 4.1, w: 7.6, h: 0.35, fontFace: BODY, fontSize: 12, italic: true, color: C.muted, margin: 0, isTextBox: true });
  bullets(s, ["A second photo, taken 7 s later from almost the same spot, aligned pixel for pixel; only the cat's ears moved", "It was graded Tier 1 evidence: a false positive, 1 of 20 sibling pairs", "Fix: tighter typical-residual limit; the pair is now a lead for human review", "Honest limit: the margin is one grey level, so near-same-position captures stay the main risk"], 8.5, 1.5, 4.25, 4.8, 15);
  card(s, M, 4.7, 7.6, 1.8, C.tealLt);
  s.addText([{ text: "Why it matters: ", options: { bold: true } }, { text: "Tier 1 can block someone else's registration, so we tuned for fewer false alarms and kept human review for the gap." }],
    { x: M + 0.3, y: 4.8, w: 7.0, h: 1.6, fontFace: BODY, fontSize: 16, color: C.text, margin: 0, valign: "middle", isTextBox: true });
  evidence(s, "full evaluation run (failures.csv, per_candidate.csv); EXIF capture times in the dataset");
}

// 20. Provenance ------------------------------------------------------------------------------------
{
  const s = lightSlide("Provenance metadata: every planted case recognised", "Evaluated on 40 labelled files plus 75 Gemini edits, 49 WhatsApp copies and 104 originals.");
  table(s, [[hdr("Test set"), hdr("Result")],
    ["Corrupted C2PA manifests (10)", "10 of 10 reported as tampered / invalid"],
    ["Metadata-stripped copies (10)", "10 of 10 reported as no provenance (not \"real\")"],
    ["XMP IPTC AI tags (10)", "10 of 10 detected as declared AI"],
    ["Signed C2PA files (10)", "10 of 10 manifests read; 5 verified, 5 have an invalid signing certificate"],
    ["Gemini AI edits (75)", "75 of 75 declare AI generation"],
    ["WhatsApp copies and originals (153)", "0 false provenance claims"]],
    { x: M, y: 1.6, w: 8.2, colW: [3.6, 4.6], fontSize: 14, rowH: 0.7 });
  card(s, 9.3, 1.6, 3.45, 4.7);
  s.addText("Bug this found", { x: 9.55, y: 1.8, w: 3.0, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.ink, margin: 0, isTextBox: true });
  s.addText("The first version reported \"C2PA manifest found\" on every image, including plain PNGs. It now reads the manifest and checks the signature.", { x: 9.55, y: 2.4, w: 3.0, h: 3.7, fontFace: BODY, fontSize: 14, color: C.text, margin: 0, valign: "top", isTextBox: true });
  evidence(s, "provenance evaluation (provenance_summary.md, provenance_per_file.csv)");
}

// 21. Latency ---------------------------------------------------------------------------------------
{
  const L = d.latency;
  const s = lightSlide("About " + L.total.p50.toFixed(1) + " seconds per check on a CPU-only laptop", "Retrieval and image decoding dominate; candidate checking runs in parallel.", { results: true });
  const stages = [["Normalise", "g0_normalize"], ["Retrieve", "g1_retrieve"], ["Verify + compare", "candidates_wall"], ["Evidence images", "g5_evidence"], ["Total", "total"]];
  s.addChart(pres.charts.BAR, [{ name: "Median", labels: stages.map((x) => x[0]), values: stages.map((x) => L[x[1]].p50) }, { name: "95th percentile", labels: stages.map((x) => x[0]), values: stages.map((x) => L[x[1]].p95) }],
    Object.assign({ x: M, y: 1.4, w: 8.0, h: 5.3, barDir: "col", barGrouping: "clustered", chartColors: [C.teal, "B7C4D2"], showValue: true, dataLabelFormatCode: "0.0", dataLabelPosition: "outEnd", valAxisLabelFormatCode: "0.0\"s\"", showLegend: true, legendPos: "b" }, chartBase("Seconds per stage")));
  stat(s, 9.1, 1.6, 3.6, L.total.p50.toFixed(1) + " s", "median per check, including evidence images", C.teal);
  stat(s, 9.1, 3.4, 3.6, String(L.candidates_median), "candidates verified per check (8 before measured tuning)", C.amber);
  s.addText("Retrieval depth was cut from 5 to 3 because the true work was in the top 3 for every positive tested.", { x: 9.1, y: 5.3, w: 3.6, h: 1.1, fontFace: BODY, fontSize: 13, italic: true, color: C.muted, margin: 0, valign: "top", isTextBox: true });
}

// 23. Run log ---------------------------------------------------------------------------------------
{
  const s = lightSlide("Every evaluation run in one table", "Each run has a results folder in the repository; nothing here is from memory.");
  const finalRow = FINAL
    ? ["Final run", d.suspects.toLocaleString("en-US") + " images", "Full dataset, final settings", f1(d.positive_all.tier1) + " Tier 1 on copies; " + d.negatives.false_evidence + " of " + d.negatives.n + " false evidence"]
    : ["Final run", "1,399 images", "Full dataset, final settings", "See the final evidence page"];
  const rows = [[hdr("Run"), hdr("Scale"), hdr("What it tested"), hdr("Key result")],
    ["Baseline robustness", "840 copies, 32,760 pairs", "pHash vs CLIP vs fusion", "Fusion AUC 0.9992 (easy negatives)"],
    ["Case study", "1 photo, 4 images", "Real AI edits and a sibling", "Heavy edit missed; sibling scored as copy"],
    ["Five experiments", "Case images", "Pad, multi-crop, extra hashes, faces, tiles", "All five rejected"],
    ["Spikes 1 and 2", "5 + 57 images", "Alignment, DINOv2, AI detectors", "Alignment separates; detectors fail"],
    ["Gate rehearsal", "450 images, 61 works", "First end-to-end gate run", "87% Tier 1; 0 false on 33 negatives"],
    ["Provenance test", "40 + 228 files", "C2PA and XMP reading", "All planted cases recognised"],
    ["Batch 1", "786 images, 713 works", "Full evaluation", "78.8% Tier 1; 100% WhatsApp; 1 false"],
    ["Label audit", "100 originals as queries", "Dataset contamination", "2 mislabels, 1 duplicate found"],
    ["Option A", "151 images", "New settings", "Failing crops 0 to 13 of 49; false 1 to 0"],
    finalRow];
  table(s, rows, { x: M, y: 1.4, w: W - 2 * M, colW: [2.4, 2.8, 3.5, 3.43], fontSize: 11, rowH: 0.46 });
  evidence(s, "each run has its own results folder in the repository (summary.md)");
}

// 24. FINAL EVIDENCE REPORT (reserved page, filled in FINAL mode) -----------------------------------
{
  const s = lightSlide("Final evidence report: the full dataset run", "Reserved page. Filled with the complete 1,399-image run when it finishes.", { results: true });
  if (!FINAL) {
    s.addShape(pres.ShapeType.roundRect, { x: M, y: 1.6, w: W - 2 * M, h: 4.7, fill: { color: C.bg }, line: { color: C.amber, width: 1.5, dashType: "dash" }, rectRadius: 0.1 });
    s.addText("Reserved for the final evidence report", { x: M + 0.5, y: 2.3, w: W - 2 * M - 1, h: 0.7, fontFace: HEAD, fontSize: 30, bold: true, color: C.ink, margin: 0, isTextBox: true });
    bullets(s, ["Full run: all 1,399 test images against the 713-work registry, final settings", "Headline recall, false-evidence count with 95% bound, per-edit and per-category results", "Held-out test split result and latency", "Replaces this page automatically when the run completes"], M + 0.5, 3.2, W - 2 * M - 1, 2.8, 18);
  } else {
    const iv = interim;
    stat(s, M, 1.55, 3.0, f1(d.positive_all.tier1), "of altered copies get pixel-level evidence (interim " + f1(iv.positive_all.tier1) + ")", C.teal);
    stat(s, M + 3.1, 1.55, 3.0, d.negatives.false_evidence + " of " + d.negatives.n, "look-alikes called evidence (95% bound " + f1(d.negatives.upper95) + ")", C.amber);
    stat(s, M + 6.2, 1.55, 3.0, f1(d.positive.platform ? d.positive.platform.tier1 : null), "of real WhatsApp round-trips graded Tier 1", C.teal);
    stat(s, M + 9.3, 1.55, 3.0, d.latency.total.p50.toFixed(1) + " s", "median per check (95th percentile " + d.latency.total.p95.toFixed(1) + " s)", C.teal);
    table(s, [[hdr("Measure"), hdr("Interim (batch 1)"), hdr("Final run")],
      ["Test images", int(iv.suspects), int(d.suspects)],
      ["Tier 1 on altered copies", f1(iv.positive_all.tier1), f1(d.positive_all.tier1)],
      ["Any claim reported on copies", f1(iv.positive_all.any_claim), f1(d.positive_all.any_claim)],
      ["Held-out test split, Tier 1 (scripted edits)", f1(iv.split.test.tier1), f1(d.split.test.tier1)],
      ["Evidence claims on look-alikes", iv.negatives.false_evidence + " of " + iv.negatives.n, d.negatives.false_evidence + " of " + d.negatives.n]],
      { x: M, y: 3.7, w: W - 2 * M, colW: [5.6, 3.3, 3.23], fontSize: 13, rowH: 0.45 });
  }
}

// 25. Limits ----------------------------------------------------------------------------------------
{
  const s = lightSlide("Honest limits and what comes next", "Say these out loud; they are part of the contribution.");
  card(s, M, 1.6, 5.95, 4.9); card(s, M + 6.2, 1.6, 5.93, 4.9, C.tealLt);
  s.addText("Known limits", { x: M + 0.3, y: 1.8, w: 5.3, h: 0.5, fontFace: HEAD, fontSize: 22, bold: true, color: C.ink, margin: 0, isTextBox: true });
  bullets(s, ["Heavy AI regeneration cannot be linked by any pixel method", "Two shots from almost the same position can pass as evidence; keep human review", "10% crops and very small images have too few features", "Re-photographed screens and prints are not modelled", "Thresholds come from this dataset: re-check on new data"], M + 0.3, 2.4, 5.4, 4.0, 15);
  s.addText("Next steps", { x: M + 6.5, y: 1.8, w: 5.3, h: 0.5, fontFace: HEAD, fontSize: 22, bold: true, color: C.ink, margin: 0, isTextBox: true });
  bullets(s, ["Learned matcher as a fallback for flat art and blur, kept only if it beats an ablation", "Noise-pattern check to separate near-identical captures", "Evaluate at 5,000+ registered works and on more AI editors", "Browser extension and takedown-request workflow"], M + 6.5, 2.4, 5.3, 4.0, 15);
}

// 26. Conclusion ------------------------------------------------------------------------------------
{
  const s = pres.addSlide(); n++; s.background = { color: C.ink };
  s.addText("What we can now say", { x: 0.9, y: 0.8, w: 11.5, h: 0.9, fontFace: HEAD, fontSize: 40, bold: true, color: C.white, margin: 0, isTextBox: true });
  const items = [[f0(d.positive_all.tier1), "of altered copies get pixel-level evidence; a lead for " + f0(d.positive_all.any_claim) + " in total"],
                 [d.negatives.false_evidence + " / " + d.negatives.n, "look-alikes wrongly called evidence, against 70% for the classic score at its strict threshold"],
                 [d.latency.total.p50.toFixed(1) + " s", "median check time on a CPU-only laptop, with evidence images a person can verify"]];
  items.forEach((it, i) => {
    const y = 2.2 + i * 1.45;
    s.addText(it[0], { x: 0.9, y, w: 3.4, h: 1.1, fontFace: HEAD, fontSize: 44, bold: true, color: C.amber, margin: 0, valign: "middle", isTextBox: true });
    s.addText(it[1], { x: 4.5, y, w: 8.0, h: 1.1, fontFace: BODY, fontSize: 20, color: "DCE6F0", margin: 0, valign: "middle", isTextBox: true });
  });
  s.addText("Graded, checkable evidence, not a black-box score.", { x: 0.9, y: 6.5, w: 11.5, h: 0.5, fontFace: BODY, fontSize: 18, italic: true, color: "8FA6BD", margin: 0, isTextBox: true });
}

pres.writeFile({ fileName: OUT }).then(() => console.log("wrote", OUT, "slides:", n, FINAL ? "(final mode)" : "(reserved final page)"));
