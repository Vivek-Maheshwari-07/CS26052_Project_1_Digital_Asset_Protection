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

  it('parses real-header CSV and gives AUC 1.0 on perfectly separable real-header data for every base method', () => {
    // Real API Header
    const realCsvContent = `run_id,split,category,original_id,query_file,transform,strength,is_true_copy,method,score,score_kind,latency_ms,created_at
run_1,test,identity,orig_1,q1.png,none,none,True,phash,0,distance,0.4,2026-10-01T00:00:00Z
run_1,test,hard_negative,orig_1,q2.png,none,none,False,phash,32,distance,0.4,2026-10-01T00:00:00Z
run_1,test,identity,orig_1,q1.png,none,none,True,dhash,0,distance,0.4,2026-10-01T00:00:00Z
run_1,test,hard_negative,orig_1,q2.png,none,none,False,dhash,32,distance,0.4,2026-10-01T00:00:00Z
run_1,test,identity,orig_1,q1.png,none,none,True,ahash,0,distance,0.4,2026-10-01T00:00:00Z
run_1,test,hard_negative,orig_1,q2.png,none,none,False,ahash,32,distance,0.4,2026-10-01T00:00:00Z
run_1,test,identity,orig_1,q1.png,none,none,True,whash,0,distance,0.4,2026-10-01T00:00:00Z
run_1,test,hard_negative,orig_1,q2.png,none,none,False,whash,32,distance,0.4,2026-10-01T00:00:00Z
run_1,test,identity,orig_1,q1.png,none,none,True,clip,0.95,cosine,10.2,2026-10-01T00:00:00Z
run_1,test,hard_negative,orig_1,q2.png,none,none,False,clip,0.15,cosine,10.2,2026-10-01T00:00:00Z
run_1,test,identity,orig_1,q1.png,none,none,True,dino,0.98,cosine,14.5,2026-10-01T00:00:00Z
run_1,test,hard_negative,orig_1,q2.png,none,none,False,dino,0.12,cosine,14.5,2026-10-01T00:00:00Z
run_1,test,identity,orig_1,q1.png,none,none,True,cascade,1.0,probability,1.2,2026-10-01T00:00:00Z
`;

    const rows = parseResultsCsv(realCsvContent);
    expect(rows.length).toBe(13);

    const result = computeFullBenchmarkCurves(rows);
    expect(result.rocCurve.length).toBe(101);
    expect(result.aucByMethod.phash.rocAuc).toBe(1.0);
    expect(result.aucByMethod.dhash.rocAuc).toBe(1.0);
    expect(result.aucByMethod.ahash.rocAuc).toBe(1.0);
    expect(result.aucByMethod.whash.rocAuc).toBe(1.0);
    expect(result.aucByMethod.clip.rocAuc).toBe(1.0);
    expect(result.aucByMethod.dino.rocAuc).toBe(1.0);
    expect(result.cascadePoint).toBeDefined();
    expect(result.cascadePoint?.tpr).toBe(1.0);
  });

  it('throws an error if CSV yields zero usable rows', () => {
    expect(() => parseResultsCsv('')).toThrow('CSV contains no data rows.');
    expect(() => parseResultsCsv('header1,header2\n')).toThrow('Zero usable benchmark rows found in CSV.');
  });
});
