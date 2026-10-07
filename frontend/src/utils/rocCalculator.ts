/**
 * ROC and PR Curve Calculation Engine.
 * Supports running in Web Worker or main thread.
 */

export interface CsvRow {
  split: string;
  category: string;
  original_id: string;
  query_file: string;
  transform: string;
  strength: string;
  is_true_copy: boolean;
  method: string;
  score_value: number;
  score_type: string;
  latency_ms: number;
}

export interface CurvePoint {
  x: number; // FPR for ROC, Recall for PR
  [method: string]: number; // TPR for ROC, Precision for PR
}

export interface MethodMetrics {
  rocPoints: { fpr: number; tpr: number }[];
  prPoints: { recall: number; precision: number }[];
  rocAuc: number;
  prAuc: number;
}

export interface RocPrResult {
  rocCurve: CurvePoint[];
  prCurve: CurvePoint[];
  aucByMethod: Record<string, { rocAuc: number; prAuc: number }>;
  cascadePoint?: { fpr: number; tpr: number; precision: number; recall: number };
}

export function parseResultsCsv(csvText: string): CsvRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",").map((c) => c.trim());
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] ?? "";
    });

    const isTrueCopy =
      rowObj.is_true_copy?.toLowerCase() === "true" ||
      rowObj.is_true_copy === "1";

    const scoreVal = parseFloat(rowObj.score_value);
    const latencyVal = parseFloat(rowObj.latency_ms);

    if (!isNaN(scoreVal)) {
      rows.push({
        split: rowObj.split || "test",
        category: rowObj.category || "identity",
        original_id: rowObj.original_id || "",
        query_file: rowObj.query_file || "",
        transform: rowObj.transform || "none",
        strength: rowObj.strength || "none",
        is_true_copy: isTrueCopy,
        method: rowObj.method || "",
        score_value: scoreVal,
        score_type: rowObj.score_type || "",
        latency_ms: isNaN(latencyVal) ? 0 : latencyVal,
      });
    }
  }

  return rows;
}

export function computeMethodRocPr(
  items: { label: number; score: number }[]
): MethodMetrics {
  if (items.length === 0) {
    return { rocPoints: [], prPoints: [], rocAuc: 0.5, prAuc: 0 };
  }

  // Sort by score descending
  items.sort((a, b) => b.score - a.score);

  const P = items.filter((i) => i.label === 1).length;
  const N = items.length - P;

  if (P === 0 || N === 0) {
    return {
      rocPoints: [{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }],
      prPoints: [{ recall: 0, precision: P === 0 ? 0 : 1 }, { recall: 1, precision: P === 0 ? 0 : 1 }],
      rocAuc: 0.5,
      prAuc: P === 0 ? 0 : 1,
    };
  }

  let tp = 0;
  let fp = 0;
  const rawRoc: { fpr: number; tpr: number }[] = [{ fpr: 0, tpr: 0 }];
  const rawPr: { recall: number; precision: number }[] = [{ recall: 0, precision: 1 }];

  let prevScore = items[0].score;
  let rocAuc = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.score !== prevScore) {
      const currentFpr = fp / N;
      const currentTpr = tp / P;
      const prevFpr = rawRoc[rawRoc.length - 1].fpr;
      const prevTpr = rawRoc[rawRoc.length - 1].tpr;

      // Trapezoid area under ROC
      rocAuc += (currentFpr - prevFpr) * (currentTpr + prevTpr) / 2;

      rawRoc.push({ fpr: currentFpr, tpr: currentTpr });
      rawPr.push({ recall: currentTpr, precision: tp / (tp + fp) });
      prevScore = item.score;
    }

    if (item.label === 1) tp++;
    else fp++;
  }

  // Final point
  const finalFpr = fp / N;
  const finalTpr = tp / P;
  const prevFpr = rawRoc[rawRoc.length - 1].fpr;
  const prevTpr = rawRoc[rawRoc.length - 1].tpr;
  rocAuc += (finalFpr - prevFpr) * (finalTpr + prevTpr) / 2;

  rawRoc.push({ fpr: finalFpr, tpr: finalTpr });
  rawPr.push({ recall: finalTpr, precision: tp / (tp + fp) });

  // Compute PR AUC via average precision
  let prAuc = 0;
  for (let i = 1; i < rawPr.length; i++) {
    const deltaRecall = rawPr[i].recall - rawPr[i - 1].recall;
    if (deltaRecall > 0) {
      prAuc += deltaRecall * rawPr[i].precision;
    }
  }

  return {
    rocPoints: rawRoc,
    prPoints: rawPr,
    rocAuc: Number(rocAuc.toFixed(4)),
    prAuc: Number(prAuc.toFixed(4)),
  };
}

export function computeFullBenchmarkCurves(rows: CsvRow[]): RocPrResult {
  const testRows = rows.filter(
    (r) => (r.split.toLowerCase() === "test" || !r.split) && r.method.toLowerCase() !== "cascade"
  );

  const baseMethods = ["phash", "dhash", "ahash", "whash", "clip", "dino"];
  const methodMap: Record<string, { label: number; score: number }[]> = {};

  baseMethods.forEach((m) => {
    methodMap[m] = [];
  });

  testRows.forEach((r) => {
    const m = r.method.toLowerCase();
    if (methodMap[m]) {
      // Hash methods: score is negative hamming (lower distance = higher similarity)
      // Deep methods: score is cosine similarity directly
      const normalizedScore = m.includes("hash") ? -r.score_value : r.score_value;
      methodMap[m].push({
        label: r.is_true_copy ? 1 : 0,
        score: normalizedScore,
      });
    }
  });

  const methodMetrics: Record<string, MethodMetrics> = {};
  const aucByMethod: Record<string, { rocAuc: number; prAuc: number }> = {};

  baseMethods.forEach((m) => {
    const metrics = computeMethodRocPr(methodMap[m]);
    methodMetrics[m] = metrics;
    aucByMethod[m] = { rocAuc: metrics.rocAuc, prAuc: metrics.prAuc };
  });

  // Interpolate 101 sample points (0.00 to 1.00) for uniform charting
  const sampleSteps = 100;
  const rocCurve: CurvePoint[] = [];
  const prCurve: CurvePoint[] = [];

  for (let step = 0; step <= sampleSteps; step++) {
    const x = step / sampleSteps;
    const rocRow: CurvePoint = { x };
    const prRow: CurvePoint = { x };

    baseMethods.forEach((m) => {
      const { rocPoints, prPoints } = methodMetrics[m];

      // Lookup TPR for given FPR in ROC
      let tprVal = 0;
      for (let i = 0; i < rocPoints.length - 1; i++) {
        if (x >= rocPoints[i].fpr && x <= rocPoints[i + 1].fpr) {
          const t = (x - rocPoints[i].fpr) / (rocPoints[i + 1].fpr - rocPoints[i].fpr || 1);
          tprVal = rocPoints[i].tpr + t * (rocPoints[i + 1].tpr - rocPoints[i].tpr);
          break;
        }
      }
      if (x >= 1) tprVal = 1;
      rocRow[m] = Number(tprVal.toFixed(4));

      // Lookup Precision for given Recall in PR
      let precVal = 0;
      for (let i = 0; i < prPoints.length - 1; i++) {
        if (x >= prPoints[i].recall && x <= prPoints[i + 1].recall) {
          const t = (x - prPoints[i].recall) / (prPoints[i + 1].recall - prPoints[i].recall || 1);
          precVal = prPoints[i].precision + t * (prPoints[i + 1].precision - prPoints[i].precision);
          break;
        }
      }
      if (x === 0 && prPoints.length > 0) precVal = prPoints[0].precision;
      prRow[m] = Number(precVal.toFixed(4));
    });

    rocCurve.push(rocRow);
    prCurve.push(prRow);
  }

  return {
    rocCurve,
    prCurve,
    aucByMethod,
  };
}
