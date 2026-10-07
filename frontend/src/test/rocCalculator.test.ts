import { describe, it, expect } from 'vitest';
import {
  parseResultsCsv,
  computeMethodRocPr,
  computeFullBenchmarkCurves,
} from '../utils/rocCalculator';

describe('ROC & PR Curve Calculator Engine', () => {
  it('gives AUC = 1.0 on perfectly separable predictions', () => {
    const separableItems = [
      { label: 1, score: 0.99 },
      { label: 1, score: 0.95 },
      { label: 1, score: 0.90 },
      { label: 0, score: 0.30 },
      { label: 0, score: 0.20 },
      { label: 0, score: 0.10 },
    ];

    const metrics = computeMethodRocPr(separableItems);
    expect(metrics.rocAuc).toBe(1.0);
    expect(metrics.prAuc).toBe(1.0);
  });

  it('gives AUC = 0.5 on all-ties / non-discriminating predictions', () => {
    const tiedItems = [
      { label: 1, score: 0.5 },
      { label: 0, score: 0.5 },
      { label: 1, score: 0.5 },
      { label: 0, score: 0.5 },
    ];

    const metrics = computeMethodRocPr(tiedItems);
    expect(metrics.rocAuc).toBe(0.5);
  });

  it('parses CSV rows and generates curve points for all base methods', () => {
    const csvContent = `split,category,original_id,query_file,transform,strength,is_true_copy,method,score_value,score_type,latency_ms
test,identity,img1,q1.png,none,none,True,phash,0,hamming,0.5
test,hard_neg,img1,q2.png,none,none,False,phash,30,hamming,0.5
test,identity,img1,q1.png,none,none,True,dino,0.98,cosine,12.0
test,hard_neg,img1,q2.png,none,none,False,dino,0.20,cosine,12.0
`;

    const rows = parseResultsCsv(csvContent);
    expect(rows.length).toBe(4);

    const result = computeFullBenchmarkCurves(rows);
    expect(result.rocCurve.length).toBe(101);
    expect(result.aucByMethod.phash.rocAuc).toBe(1.0);
    expect(result.aucByMethod.dino.rocAuc).toBe(1.0);
  });
});
