import React, { useEffect, useState, useMemo } from "react";
import {
  getBenchmarkRuns,
  getBenchmarkSummary,
  getBenchmarkResultsCsvUrl,
  fetchBenchmarkResultsCsv,
} from "../api/client";
import type { BenchmarkSummary } from "../api/types";
import { processCsvInWorker } from "../utils/rocWorker";
import { type RocPrResult } from "../utils/rocCalculator";
import {
  getHeatmapCellColor,
  CHART_METHODS,
} from "../utils/heatmap";
import { useTheme } from "../context/useTheme";
import { Kicker } from "../components/ui/Kicker";
import { Sticker } from "../components/ui/Sticker";
import { PaperCard } from "../components/ui/PaperCard";
import { MetricNumber } from "../components/ui/MetricNumber";
import { BackgroundCircle } from "../components/ui/BackgroundCircle";
import { Marquee } from "../components/ui/Marquee";
import {
  Download,
  BarChart3,
  Terminal,
  Activity,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Scatter,
  ComposedChart,
} from "recharts";
import { playTick } from "../utils/sound";

export const ResultsDashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const [runs, setRuns] = useState<{ run_id: string; created_at: string }[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected transform for strength degradation curves
  const [selectedTransform, setSelectedTransform] = useState<string>("");

  // Latency chart scale toggle: "linear" | "log"
  const [latencyScale, setLatencyScale] = useState<"linear" | "log">("linear");

  // ROC/PR curves
  const [rocPrData, setRocPrData] = useState<RocPrResult | null>(null);
  const [isWorkerCalculating, setIsWorkerCalculating] = useState<boolean>(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Fetch benchmark runs
  useEffect(() => {
    let isMounted = true;
    getBenchmarkRuns()
      .then((runList) => {
        if (!isMounted) return;
        setRuns(runList);
        if (runList.length > 0) {
          setSelectedRunId(runList[0].run_id);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load benchmark runs."
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch summary and CSV for selected run
  useEffect(() => {
    if (!selectedRunId) return;

    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        setIsLoading(true);
        setError(null);
        setWorkerError(null);
      }
    });

    getBenchmarkSummary(selectedRunId)
      .then((data) => {
        if (!isMounted) return;
        setSummary(data);
        if (data.by_transform && data.by_transform.length > 0) {
          const validTransforms = Array.from(
            new Set(data.by_transform.map((t) => t.transform))
          ).filter((t) => t && t !== "none");
          if (validTransforms.includes("jpeg")) {
            setSelectedTransform("jpeg");
          } else if (validTransforms.length > 0) {
            setSelectedTransform(validTransforms[0]);
          }
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to fetch benchmark summary."
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Fetch CSV and calculate ROC/PR via Web Worker
    fetchBenchmarkResultsCsv(selectedRunId)
      .then((csvText) => {
        if (isMounted) setIsWorkerCalculating(true);
        return processCsvInWorker(csvText);
      })
      .then((computed) => {
        if (isMounted) setRocPrData(computed);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setWorkerError(
            err instanceof Error ? err.message : "Failed to parse benchmark ROC curves."
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsWorkerCalculating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRunId]);

  // Methods list for heatmap
  const methods = useMemo(
    () => ["phash", "dhash", "ahash", "whash", "clip", "dino", "cascade"],
    []
  );

  // Distinct transforms for curves (excluding "none")
  const availableTransforms = useMemo(() => {
    if (!summary?.by_transform) return [];
    const set = new Set<string>();
    summary.by_transform.forEach((t) => {
      if (t.transform && t.transform !== "none") {
        set.add(t.transform);
      }
    });
    return Array.from(set);
  }, [summary]);

  // Strength curves data for the selected transform
  const strengthCurveData = useMemo(() => {
    if (!summary?.by_transform || !selectedTransform) return [];
    const strengths = ["weak", "medium", "strong"];
    const filtered = summary.by_transform.filter(
      (t) => t.transform.toLowerCase() === selectedTransform.toLowerCase()
    );

    return strengths.map((str) => {
      const row: Record<string, number | string> = { strength: str.toUpperCase() };
      methods.forEach((m) => {
        const item = filtered.find(
          (t) =>
            t.strength.toLowerCase() === str.toLowerCase() &&
            t.method.toLowerCase() === m.toLowerCase()
        );
        if (item) {
          row[m] = Number(item.f1.toFixed(3));
        }
      });
      return row;
    });
  }, [summary, selectedTransform, methods]);

  // Latency comparison data across methods
  const latencyData = useMemo(() => {
    if (!summary?.by_transform) return [];
    const methodLatencies: Record<string, number[]> = {};
    methods.forEach((m) => (methodLatencies[m] = []));

    summary.by_transform.forEach((t) => {
      const m = t.method.toLowerCase();
      if (methodLatencies[m]) {
        methodLatencies[m].push(t.median_latency_ms);
      }
    });

    return methods.map((m) => {
      const latList = methodLatencies[m];
      const avg =
        latList.length > 0
          ? latList.reduce((a, b) => a + b, 0) / latList.length
          : 0;
      
      const clampedVal = latencyScale === "log" ? (avg <= 0 ? 0.01 : avg) : avg;

      return {
        method: m.toUpperCase(),
        latency: Number(clampedVal.toFixed(2)),
        rawLatency: avg,
        displayLatency: avg <= 0 && latencyScale === "log" ? "<0.01" : avg.toFixed(2),
      };
    });
  }, [summary, methods, latencyScale]);

  return (
    <div className="relative min-w-0 max-w-[1080px] mx-auto px-4 pt-24 pb-16 flex flex-col gap-10 z-10">
      <BackgroundCircle />

      {/* Hero Header */}
      <section className="flex flex-col gap-6 pt-4 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Kicker>● BENCHMARK EVALUATION & RETRIEVAL ACCURACY</Kicker>
          {selectedRunId && (
            <Sticker variant="cobalt" rotate={-1}>
              RUN: {selectedRunId.slice(0, 12)}
            </Sticker>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="font-display text-[clamp(40px,7vw,84px)] leading-[0.95] tracking-[-0.02em] text-(--ink) m-0 font-normal">
              The <span className="italic text-(--cobalt-text)">results</span>.
            </h1>
            <p className="text-[17px] text-(--ink-soft) max-w-[42ch] m-0 mt-2">
              Empirical evaluation across transformations, look-alike queries,
              Hamming bit-distance distributions, and deep feature embeddings.
            </p>
          </div>

          {selectedRunId && (
            <a
              href={getBenchmarkResultsCsvUrl(selectedRunId)}
              download={`benchmark_${selectedRunId}.csv`}
              onClick={() => playTick()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-(--paper-2) border border-(--rule) font-mono text-[13px] font-bold uppercase text-(--ink) hover:bg-(--ink) hover:text-(--paper) shadow-hard-sm transition-colors no-underline select-none shrink-0"
            >
              <Download size={15} />
              <span>Download master_results.csv</span>
            </a>
          )}
        </div>
      </section>

      {/* Benchmark Run Selector */}
      {runs.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--ink-soft)">
            SELECT BENCHMARK RUN ({runs.length} AVAILABLE)
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {runs.map((r, idx) => {
              const isSelected = r.run_id === selectedRunId;
              return (
                <button
                  key={r.run_id}
                  type="button"
                  onClick={() => {
                    playTick();
                    setSelectedRunId(r.run_id);
                  }}
                  className={`px-4 py-2 rounded-full font-mono text-[12px] font-bold uppercase tracking-wider transition-all select-none ${
                    isSelected
                      ? "bg-(--ink) text-(--paper) shadow-hard-sm scale-105"
                      : "bg-(--paper-2) text-(--ink-soft) border border-(--rule) hover:text-(--ink)"
                  }`}
                >
                  Run #{idx + 1} ({new Date(r.created_at).toLocaleDateString()})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State when no runs exist */}
      {!isLoading && runs.length === 0 && (
        <PaperCard important className="flex flex-col items-center text-center p-8 md:p-12 gap-6">
          <div className="w-14 h-14 rounded-full bg-(--ochre)/20 text-(--ink) flex items-center justify-center">
            <BarChart3 size={28} />
          </div>

          <div className="flex flex-col gap-2 max-w-lg">
            <h2 className="font-display text-[32px] text-(--ink) m-0">
              No Benchmark Runs Found
            </h2>
            <p className="text-[15px] text-(--ink-soft) m-0">
              To populate the results dashboard with empirical evaluations, execute
              the offline benchmark pipeline using the commands below:
            </p>
          </div>

          <div className="w-full max-w-xl bg-(--ink) text-(--paper) rounded-xl p-5 text-left font-mono text-[13px] overflow-x-auto shadow-inner">
            <div className="flex items-center gap-2 text-(--ink-soft) mb-3 pb-2 border-b border-(--paper)/15 text-[11px]">
              <Terminal size={14} />
              <span>TERMINAL COMMANDS (POWERSHELL)</span>
            </div>
            <div className="flex flex-col gap-1.5 text-(--ochre)">
              <div>python -m bench.make_manifest</div>
              <div>python -m bench.attack</div>
              <div>python -m bench.evaluate --write-db</div>
            </div>
          </div>
        </PaperCard>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 text-center font-mono text-[14px] text-(--ink-soft) animate-pulse">
          Loading benchmark metrics and evaluating curves...
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-4 bg-(--vermilion)/10 border border-(--vermilion)/30 rounded-xl text-(--vermilion-text) font-mono text-[13px]">
          {error}
        </div>
      )}

      {/* Results Content */}
      {summary && !isLoading && (
        <div className="flex flex-col gap-10">
          {/* KPI Row (MetricNumber cards with hard shadows) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <PaperCard important className="p-5">
              <MetricNumber
                label="ORIGINALS"
                value={summary.n_originals}
                sublabel="Indexed assets"
              />
            </PaperCard>

            <PaperCard important className="p-5">
              <MetricNumber
                label="HARD NEGATIVES"
                value={summary.n_hard_negatives}
                sublabel="Look-alike images"
              />
            </PaperCard>

            <PaperCard important className="p-5">
              <MetricNumber
                label="CASCADE ACCURACY"
                value={`${(summary.cascade.accuracy * 100).toFixed(1)}%`}
                sublabel="Test-split accuracy"
                valueClassName="text-(--sage-text)"
              />
            </PaperCard>

            <PaperCard important className="p-5">
              <MetricNumber
                label="CASCADE LATENCY"
                value={summary.cascade.mean_latency_ms.toFixed(1)}
                unit="ms"
                sublabel="Mean response time"
              />
            </PaperCard>

            <PaperCard important className="p-5 col-span-2 md:col-span-1">
              <MetricNumber
                label="ESCALATION RATE"
                value={`${(summary.cascade.escalation_rate * 100).toFixed(1)}%`}
                sublabel="Deep stage handoff"
                valueClassName="text-(--ochre-text)"
              />
            </PaperCard>
          </div>

          {/* Recall Heatmap Card */}
          <PaperCard important className="flex flex-col gap-6 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-(--rule) pb-4">
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--cobalt-text)">
                  ATTACK MATRIX
                </span>
                <h3 className="font-display text-[24px] text-(--ink) m-0">
                  Recall Heatmap Matrix
                </h3>
              </div>

              {/* Heatmap Legend Bar */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-(--ink-soft) uppercase">
                  Recall 0%
                </span>
                <div className="w-28 h-3 rounded-full bg-gradient-to-r from-(--paper-2) to-(--cobalt) border border-(--rule)" />
                <span className="font-mono text-[11px] text-(--ink-soft) uppercase">
                  100%
                </span>
              </div>
            </div>

            {/* Matrix Table with Horizontal Scroll & Sticky Column */}
            <div className="overflow-x-auto w-full pb-2">
              <div className="min-w-[640px] flex flex-col gap-1.5">
                {/* Columns Header */}
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-(--ink-soft) uppercase pb-1 border-b border-(--rule)">
                  <div className="w-28 sticky left-0 bg-(--paper-2) z-10">
                    METHOD
                  </div>
                  {summary.by_transform.slice(0, 10).map((t, idx) => (
                    <div
                      key={idx}
                      className="flex-1 text-center truncate px-1"
                      title={`${t.transform} (${t.strength})`}
                    >
                      {t.transform.slice(0, 5)} {t.strength.slice(0, 1)}
                    </div>
                  ))}
                </div>

                {/* Rows per Method */}
                {methods.map((method) => {
                  return (
                    <div key={method} className="flex items-center gap-1.5">
                      <div className="w-28 sticky left-0 bg-(--paper-2) z-10 font-mono text-[12px] font-bold uppercase text-(--ink)">
                        {method}
                      </div>

                      {summary.by_transform.slice(0, 10).map((t, colIdx) => {
                        const cellItem = summary.by_transform.find(
                          (item) =>
                            item.transform === t.transform &&
                            item.strength === t.strength &&
                            item.method.toLowerCase() === method.toLowerCase()
                        );

                        const recallVal = cellItem ? cellItem.recall : 0;
                        const { bg, text } = getHeatmapCellColor(
                          recallVal,
                          theme === "dark" ? "ink" : "paper"
                        );

                        return (
                          <div
                            key={colIdx}
                            style={{ backgroundColor: bg, color: text }}
                            title={`${method.toUpperCase()} @ ${t.transform} (${t.strength})\nRecall: ${recallVal.toFixed(3)}\nPrecision: ${cellItem?.precision.toFixed(3) ?? 0}\nF1: ${cellItem?.f1.toFixed(3) ?? 0}`}
                            className="flex-1 h-9 rounded-[4px] flex items-center justify-center font-mono text-[11px] font-bold tabular-nums transition-transform hover:scale-105 cursor-pointer shadow-xs"
                          >
                            {cellItem ? cellItem.recall.toFixed(2) : "—"}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </PaperCard>

          {/* Strength Curves & Latency Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strength Degradation Curves */}
            <PaperCard important className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 border-b border-(--rule) pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--cobalt-text)">
                    ROBUSTNESS ANALYSIS
                  </span>
                  <Activity size={16} className="text-(--ink-soft)" />
                </div>
                <h3 className="font-display text-[22px] text-(--ink) m-0">
                  Strength Degradation Curves (F1)
                </h3>

                {/* Wrapping Transform Selector Stickers (excluding 'none') */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {availableTransforms.map((tr) => {
                    const isSelected = tr === selectedTransform;
                    return (
                      <button
                        key={tr}
                        type="button"
                        onClick={() => {
                          playTick();
                          setSelectedTransform(tr);
                        }}
                        className={`px-2.5 py-1 rounded-sm font-mono text-[10px] font-bold uppercase transition-all ${
                          isSelected
                            ? "bg-(--ink) text-(--paper) shadow-hard-sm"
                            : "bg-(--paper) text-(--ink-soft) border border-(--rule) hover:text-(--ink)"
                        }`}
                      >
                        {tr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={strengthCurveData}>
                    <XAxis
                      dataKey="strength"
                      stroke="var(--ink-soft)"
                      tick={{ fill: "var(--ink)", fontSize: 11, fontFamily: "Space Mono" }}
                    />
                    <YAxis
                      domain={[0, 1]}
                      stroke="var(--ink-soft)"
                      tick={{ fill: "var(--ink)", fontSize: 11, fontFamily: "Space Mono" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--paper)",
                        borderColor: "var(--rule)",
                        borderRadius: "8px",
                        fontFamily: "Space Mono",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "Space Mono" }} />
                    {CHART_METHODS.map((m) => (
                      <Line
                        key={m.key}
                        type="monotone"
                        dataKey={m.key}
                        name={m.name}
                        stroke={m.color}
                        strokeDasharray={m.strokeDasharray}
                        strokeWidth={m.strokeWidth ?? 2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </PaperCard>

            {/* Latency Comparison BarChart */}
            <PaperCard important className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-(--rule) pb-3">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--ochre-text)">
                    COMPUTATION PROFILE
                  </span>
                  <h3 className="font-display text-[22px] text-(--ink) m-0">
                    Latency Comparison
                  </h3>
                </div>

                {/* Scale Toggle: Linear / Log */}
                <div className="flex items-center p-0.5 bg-(--paper) border border-(--rule) rounded-full font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      playTick();
                      setLatencyScale("linear");
                    }}
                    className={`px-2.5 py-0.5 rounded-full uppercase font-bold transition-colors ${
                      latencyScale === "linear"
                        ? "bg-(--ink) text-(--paper)"
                        : "text-(--ink-soft)"
                    }`}
                  >
                    Linear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTick();
                      setLatencyScale("log");
                    }}
                    className={`px-2.5 py-0.5 rounded-full uppercase font-bold transition-colors ${
                      latencyScale === "log"
                        ? "bg-(--ink) text-(--paper)"
                        : "text-(--ink-soft)"
                    }`}
                  >
                    Log
                  </button>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latencyData}>
                    <XAxis
                      dataKey="method"
                      stroke="var(--ink-soft)"
                      tick={{ fill: "var(--ink)", fontSize: 11, fontFamily: "Space Mono" }}
                    />
                    <YAxis
                      scale={latencyScale === "log" ? "log" : "auto"}
                      domain={latencyScale === "log" ? [0.01, "auto"] : [0, "auto"]}
                      stroke="var(--ink-soft)"
                      tick={{ fill: "var(--ink)", fontSize: 11, fontFamily: "Space Mono" }}
                      unit=" ms"
                    />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${item?.payload?.displayLatency ?? val} ms`,
                        "Latency",
                      ]}
                      contentStyle={{
                        backgroundColor: "var(--paper)",
                        borderColor: "var(--rule)",
                        borderRadius: "8px",
                        fontFamily: "Space Mono",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="latency" fill="var(--cobalt)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PaperCard>
          </div>

          {/* Client-Side Web Worker ROC and PR Curves */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ROC Curve Chart */}
            <PaperCard important className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-(--rule) pb-3">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--cobalt-text)">
                    DISCRIMINATION ABILITY
                  </span>
                  <h3 className="font-display text-[22px] text-(--ink) m-0">
                    ROC Curves (True vs. False Positive)
                  </h3>
                </div>
                <Zap size={16} className="text-(--ink-soft)" />
              </div>

              {isWorkerCalculating ? (
                <div className="h-64 flex items-center justify-center font-mono text-[13px] text-(--ink-soft) animate-pulse">
                  Computing ROC curves in Web Worker...
                </div>
              ) : workerError ? (
                <div className="h-64 flex items-center justify-center font-mono text-[13px] text-(--vermilion-text)">
                  {workerError}
                </div>
              ) : rocPrData ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rocPrData.rocCurve}>
                      <XAxis
                        dataKey="x"
                        domain={[0, 1]}
                        type="number"
                        stroke="var(--ink-soft)"
                        tick={{ fill: "var(--ink)", fontSize: 11, fontFamily: "Space Mono" }}
                        label={{ value: "FPR", position: "insideBottomRight", offset: -5, fill: "var(--ink)", fontSize: 10 }}
                      />
                      <YAxis
                        domain={[0, 1]}
                        stroke="var(--ink-soft)"
                        tick={{ fill: "var(--ink)", fontSize: 11, fontFamily: "Space Mono" }}
                        label={{ value: "TPR", angle: -90, position: "insideLeft", fill: "var(--ink)", fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--paper)",
                          borderColor: "var(--rule)",
                          borderRadius: "8px",
                          fontFamily: "Space Mono",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "Space Mono" }} />
                      {CHART_METHODS.filter((m) => m.key !== "cascade" || rocPrData.rocCurve.some((pt) => pt.cascade !== undefined)).map((m) => (
                        <Line
                          key={m.key}
                          type="monotone"
                          dataKey={m.key}
                          name={`${m.name}${rocPrData.aucByMethod[m.key]?.rocAuc != null ? ` (${rocPrData.aucByMethod[m.key].rocAuc.toFixed(3)})` : ""}`}
                          stroke={m.color}
                          strokeDasharray={m.strokeDasharray}
                          strokeWidth={m.strokeWidth ?? 2}
                          dot={false}
                        />
                      ))}
                      {rocPrData.cascadePoint && (
                        <Scatter
                          data={[{ x: rocPrData.cascadePoint.fpr, y: rocPrData.cascadePoint.tpr }]}
                          fill="var(--cobalt)"
                          name="Cascade Point"
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </PaperCard>

            {/* Precision-Recall Curve Chart */}
            <PaperCard important className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-(--rule) pb-3">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--sage-text)">
                    RETRIEVAL ACCURACY
                  </span>
                  <h3 className="font-display text-[22px] text-(--ink) m-0">
                    Precision-Recall Curves
                  </h3>
                </div>
                <TrendingUp size={16} className="text-(--ink-soft)" />
              </div>

              {isWorkerCalculating ? (
                <div className="h-64 flex items-center justify-center font-mono text-[13px] text-(--ink-soft) animate-pulse">
                  Computing PR curves in Web Worker...
                </div>
              ) : workerError ? (
                <div className="h-64 flex items-center justify-center font-mono text-[13px] text-(--vermilion-text)">
                  {workerError}
                </div>
              ) : rocPrData ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rocPrData.prCurve}>
                      <XAxis
                        dataKey="x"
                        domain={[0, 1]}
                        type="number"
                        stroke="var(--ink-soft)"
                        tick={{ fill: "var(--ink)", fontSize: 11, fontFamily: "Space Mono" }}
                        label={{ value: "Recall", position: "insideBottomRight", offset: -5, fill: "var(--ink)", fontSize: 10 }}
                      />
                      <YAxis
                        domain={[0, 1]}
                        stroke="var(--ink-soft)"
                        tick={{ fill: "var(--ink)", fontSize: 11, fontFamily: "Space Mono" }}
                        label={{ value: "Precision", angle: -90, position: "insideLeft", fill: "var(--ink)", fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--paper)",
                          borderColor: "var(--rule)",
                          borderRadius: "8px",
                          fontFamily: "Space Mono",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "Space Mono" }} />
                      {CHART_METHODS.filter((m) => m.key !== "cascade" || rocPrData.prCurve.some((pt) => pt.cascade !== undefined)).map((m) => (
                        <Line
                          key={m.key}
                          type="monotone"
                          dataKey={m.key}
                          name={`${m.name}${rocPrData.aucByMethod[m.key]?.prAuc != null ? ` (${rocPrData.aucByMethod[m.key].prAuc.toFixed(3)})` : ""}`}
                          stroke={m.color}
                          strokeDasharray={m.strokeDasharray}
                          strokeWidth={m.strokeWidth ?? 2}
                          dot={false}
                        />
                      ))}
                      {rocPrData.cascadePoint && (
                        <Scatter
                          data={[{ x: rocPrData.cascadePoint.recall, y: rocPrData.cascadePoint.precision }]}
                          fill="var(--cobalt)"
                          name="Cascade Operating Point"
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </PaperCard>
          </div>
        </div>
      )}

      {/* Marquee */}
      <Marquee />
    </div>
  );
};
