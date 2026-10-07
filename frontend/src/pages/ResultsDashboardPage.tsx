import React, { useEffect, useState, useMemo } from "react";
import {
  getBenchmarkRuns,
  getBenchmarkSummary,
  getBenchmarkResultsCsv,
} from "../api/client";
import type {
  BenchmarkRunInfo,
  BenchmarkSummary,
} from "../api/types";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { MetricNumber } from "../components/ui/MetricNumber";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { processCsvInWorker } from "../utils/rocWorker";
import type { RocPrResult } from "../utils/rocCalculator";
import {
  Download,
  Terminal,
  Activity,
  Layers,
  LineChart as LineChartIcon,
  BarChart3,
  Flame,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export const ResultsDashboardPage: React.FC = () => {
  const [runs, setRuns] = useState<BenchmarkRunInfo[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [rocPrData, setRocPrData] = useState<RocPrResult | null>(null);

  const [loadingRuns, setLoadingRuns] = useState<boolean>(true);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // Strength curve transform filter
  const [selectedTransform, setSelectedTransform] = useState<string>("");

  // 1. Fetch available benchmark runs
  useEffect(() => {
    let mounted = true;

    getBenchmarkRuns()
      .then((data) => {
        if (!mounted) return;
        setRuns(data);
        if (data.length > 0) {
          setSelectedRunId(data[0].run_id);
        }
      })
      .catch((err) => {
        console.error("Failed to load benchmark runs:", err);
        if (mounted) setRuns([]);
      })
      .finally(() => {
        if (mounted) setLoadingRuns(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Fetch summary & CSV when selectedRunId changes
  useEffect(() => {
    let mounted = true;
    if (!selectedRunId) {
      return;
    }

    Promise.resolve().then(() => {
      if (mounted) {
        setLoadingSummary(true);
      }
    });

    getBenchmarkSummary(selectedRunId)
      .then((data) => {
        if (!mounted) return;
        setSummary(data);

        // Set default selected transform for curves
        const transforms = Array.from(
          new Set(
            data.by_transform
              .map((t) => t.transform)
              .filter((t) => t !== "none" && t !== "identity")
          )
        );
        if (transforms.length > 0) {
          setSelectedTransform(transforms[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to load benchmark summary:", err);
        if (mounted) setSummary(null);
      })
      .finally(() => {
        if (mounted) setLoadingSummary(false);
      });

    getBenchmarkResultsCsv(selectedRunId)
      .then((csvText) => {
        if (!mounted) return;
        processCsvInWorker(csvText)
          .then((res) => {
            if (mounted) setRocPrData(res);
          })
          .catch((err) => {
            console.error("Failed to compute ROC/PR worker curves:", err);
          });
      })
      .catch((err) => {
        console.error("Failed to fetch results CSV:", err);
      });

    return () => {
      mounted = false;
    };
  }, [selectedRunId]);

  // Method Colors for Recharts (using CSS variable names or safe palette)
  const methodColors: Record<string, string> = {
    phash: "var(--chart-hash-1)",
    dhash: "var(--chart-hash-2)",
    ahash: "var(--chart-hash-3)",
    whash: "var(--chart-hash-4)",
    clip: "var(--chart-deep-1)",
    dino: "var(--chart-deep-2)",
    cascade: "var(--chart-cascade)",
  };

  // Distinct transforms for Strength Curve selector
  const availableTransforms = useMemo(() => {
    if (!summary) return [];
    return Array.from(
      new Set(
        summary.by_transform
          .map((t) => t.transform)
          .filter((t) => t !== "none" && t !== "identity")
      )
    );
  }, [summary]);

  // Strength curve data formatted for Recharts
  const strengthCurveData = useMemo(() => {
    if (!summary || !selectedTransform) return [];
    const strengths = ["weak", "medium", "strong"];
    const transformRows = summary.by_transform.filter(
      (r) => r.transform.toLowerCase() === selectedTransform.toLowerCase()
    );

    return strengths.map((str) => {
      const row: Record<string, string | number> = { strength: str };
      transformRows
        .filter((r) => r.strength.toLowerCase() === str.toLowerCase())
        .forEach((r) => {
          row[r.method] = Number(r.f1.toFixed(4));
        });
      return row;
    });
  }, [summary, selectedTransform]);

  // Latency bar chart data
  const latencyData = useMemo(() => {
    if (!summary) return [];
    const methodLatencies: Record<string, { total: number; count: number }> = {};
    const methods = ["phash", "dhash", "ahash", "whash", "clip", "dino"];

    methods.forEach((m) => {
      methodLatencies[m] = { total: 0, count: 0 };
    });

    summary.by_transform.forEach((r) => {
      const m = r.method.toLowerCase();
      if (methodLatencies[m]) {
        methodLatencies[m].total += r.median_latency_ms;
        methodLatencies[m].count += 1;
      }
    });

    return methods.map((m) => {
      const avg =
        methodLatencies[m].count > 0
          ? methodLatencies[m].total / methodLatencies[m].count
          : 0;
      return {
        method: m,
        latency_ms: Number(avg.toFixed(2)),
      };
    });
  }, [summary]);

  // Heatmap rows & columns setup
  const heatmapData = useMemo(() => {
    if (!summary) return { columns: [], rows: [] };

    // Columns: distinct transform + strength
    const colMap = new Map<string, { transform: string; strength: string; label: string }>();
    summary.by_transform.forEach((t) => {
      const key = `${t.transform}__${t.strength}`;
      if (!colMap.has(key)) {
        colMap.set(key, {
          transform: t.transform,
          strength: t.strength,
          label: `${t.transform} (${t.strength})`,
        });
      }
    });
    const columns = Array.from(colMap.values());

    // Rows: methods
    const methods = ["phash", "dhash", "ahash", "whash", "clip", "dino", "cascade"];
    const rows = methods.map((m) => {
      const cells = columns.map((col) => {
        const metric = summary.by_transform.find(
          (t) =>
            t.method.toLowerCase() === m.toLowerCase() &&
            t.transform.toLowerCase() === col.transform.toLowerCase() &&
            t.strength.toLowerCase() === col.strength.toLowerCase()
        );
        return {
          columnKey: `${col.transform}__${col.strength}`,
          recall: metric ? metric.recall : 0,
          precision: metric ? metric.precision : 0,
          f1: metric ? metric.f1 : 0,
          roc_auc: metric ? metric.roc_auc : 0,
          n_pairs: metric ? metric.n_pairs : 0,
        };
      });
      return { method: m, cells };
    });

    return { columns, rows };
  }, [summary]);

  const handleDownloadMasterCsv = () => {
    if (!selectedRunId) return;
    window.open(`/api/benchmark/results.csv?run_id=${encodeURIComponent(selectedRunId)}`, "_blank");
  };

  // Color interpolation for heatmap recall (0.00 -> 1.00)
  const getHeatmapColor = (val: number) => {
    if (val >= 0.95) return "bg-[var(--apple-success)] text-white";
    if (val >= 0.85) return "bg-[var(--apple-success)]/80 text-white";
    if (val >= 0.70) return "bg-[var(--apple-accent)] text-white";
    if (val >= 0.50) return "bg-[var(--apple-warning)] text-white";
    if (val >= 0.30) return "bg-[var(--apple-danger)]/75 text-white";
    return "bg-[var(--apple-danger)] text-white";
  };

  // Empty State if no runs exist
  if (!loadingRuns && runs.length === 0) {
    return (
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-20 animate-fadeIn">
        <Card className="max-w-xl mx-auto text-center py-12 space-y-6">
          <div className="w-16 h-16 rounded-full bg-[var(--apple-neutral-subtle)] text-[var(--apple-neutral)] mx-auto flex items-center justify-center">
            <Terminal className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-title-2 font-bold text-[var(--apple-label)]">
              No Benchmark Runs Available
            </h2>
            <p className="text-subheadline text-[var(--apple-secondary-label)]">
              Run the ProvNet offline evaluation pipeline to generate metrics and benchmarks.
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-[var(--apple-grouped-background)] border border-[var(--apple-separator)] text-left font-mono text-footnote space-y-2 text-[var(--apple-label)]">
            <div className="text-caption text-[var(--apple-secondary-label)] font-sans uppercase tracking-wider mb-1">
              Terminal Commands:
            </div>
            <div className="select-all">python -m bench.make_manifest</div>
            <div className="select-all">python -m bench.attack</div>
            <div className="select-all">python -m bench.evaluate --write-db</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fadeIn">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-large-title text-[var(--apple-label)] tracking-tight">
            Benchmark Results Dashboard
          </h1>
          <p className="text-subheadline text-[var(--apple-secondary-label)] mt-1">
            Comparative performance analysis of classical perceptual hashes vs. deep visual embeddings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleDownloadMasterCsv}
            disabled={!selectedRunId || loadingSummary}
            icon={<Download className="w-4 h-4 stroke-[1.75]" />}
          >
            Download master_results.csv
          </Button>
        </div>
      </div>

      {/* Run Selector Control */}
      {runs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[16px] bg-[var(--apple-card)] border border-[var(--apple-separator)] shadow-[var(--apple-card-shadow)]">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[var(--apple-accent)] stroke-[1.75]" />
            <span className="text-headline font-semibold text-[var(--apple-label)]">
              Evaluation Run:
            </span>
          </div>

          <div className="w-full sm:w-auto">
            {runs.length <= 4 ? (
              <SegmentedControl
                options={runs.map((r) => ({
                  value: r.run_id,
                  label: `${r.run_id} (${new Date(r.created_at).toLocaleDateString()})`,
                }))}
                value={selectedRunId}
                onChange={setSelectedRunId}
              />
            ) : (
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="h-10 px-4 rounded-[10px] bg-[var(--apple-grouped-background)] text-[var(--apple-label)] border border-[var(--apple-separator)] apple-focus text-subheadline font-medium cursor-pointer"
              >
                {runs.map((r) => (
                  <option key={r.run_id} value={r.run_id}>
                    {r.run_id} — {new Date(r.created_at).toLocaleString()} ({r.n_rows} rows)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* KPI Tiles Row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricNumber
            label="Original Assets"
            value={summary.n_originals}
            sublabel="Registered dataset"
          />
          <MetricNumber
            label="Hard Negatives"
            value={summary.n_hard_negatives}
            sublabel="Adversarial impostors"
          />
          <MetricNumber
            label="Cascade Accuracy"
            value={`${(summary.cascade.accuracy * 100).toFixed(1)}%`}
            variant="success"
            sublabel="Multi-tier pipeline"
          />
          <MetricNumber
            label="Mean Latency"
            value={`${summary.cascade.mean_latency_ms.toFixed(1)} ms`}
            sublabel="Average verification"
          />
          <MetricNumber
            label="Escalation Rate"
            value={`${(summary.cascade.escalation_rate * 100).toFixed(1)}%`}
            variant="warning"
            sublabel="Escalated to DINO/CLIP"
          />
        </div>
      )}

      {/* Recall Heatmap Matrix */}
      {summary && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[var(--apple-accent)] stroke-[1.75]" />
              <h3 className="text-title-3 font-semibold text-[var(--apple-label)]">
                Robustness & Recall Heatmap
              </h3>
            </div>
            <div className="flex items-center gap-2 text-caption text-[var(--apple-secondary-label)]">
              <span>0%</span>
              <div className="w-24 h-3 rounded-full bg-gradient-to-r from-[var(--apple-danger)] via-[var(--apple-warning)] to-[var(--apple-success)]" />
              <span>100%</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[640px]">
              {/* Table Header */}
              <div
                className="grid gap-1 mb-1 text-caption font-semibold text-[var(--apple-secondary-label)]"
                style={{
                  gridTemplateColumns: `100px repeat(${heatmapData.columns.length}, minmax(80px, 1fr))`,
                }}
              >
                <div className="p-2 text-left">Method</div>
                {heatmapData.columns.map((col) => (
                  <div key={col.label} className="p-2 text-center capitalize truncate">
                    {col.transform}
                    <span className="block text-[10px] font-normal text-[var(--apple-secondary-label)]">
                      {col.strength}
                    </span>
                  </div>
                ))}
              </div>

              {/* Table Rows */}
              {heatmapData.rows.map((row) => (
                <div
                  key={row.method}
                  className="grid gap-1 mb-1 items-center"
                  style={{
                    gridTemplateColumns: `100px repeat(${heatmapData.columns.length}, minmax(80px, 1fr))`,
                  }}
                >
                  <div className="p-2 text-subheadline font-semibold text-[var(--apple-label)] uppercase font-mono">
                    {row.method}
                  </div>
                  {row.cells.map((cell) => (
                    <div
                      key={cell.columnKey}
                      title={`Precision: ${(cell.precision * 100).toFixed(1)}%\nF1: ${cell.f1.toFixed(3)}\nAUC: ${cell.roc_auc.toFixed(3)}\nPairs: ${cell.n_pairs}`}
                      className={`h-10 rounded-[8px] flex items-center justify-center font-mono text-footnote font-bold tabular-nums transition-transform hover:scale-105 cursor-pointer ${getHeatmapColor(
                        cell.recall
                      )}`}
                    >
                      {(cell.recall * 100).toFixed(0)}%
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Strength Curves & Latency Grid */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strength Curves Chart */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-[var(--apple-accent)] stroke-[1.75]" />
                <h3 className="text-title-3 font-semibold text-[var(--apple-label)]">
                  Strength Degradation Curves
                </h3>
              </div>

              {availableTransforms.length > 0 && (
                <SegmentedControl
                  size="sm"
                  options={availableTransforms.map((t) => ({ value: t, label: t }))}
                  value={selectedTransform}
                  onChange={setSelectedTransform}
                />
              )}
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={strengthCurveData}>
                  <CartesianGrid stroke="var(--apple-separator)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="strength"
                    tick={{ fill: "var(--apple-secondary-label)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--apple-separator)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: "var(--apple-secondary-label)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--apple-separator)" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--apple-card)",
                      borderColor: "var(--apple-separator)",
                      borderRadius: "12px",
                      color: "var(--apple-label)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  {Object.keys(methodColors).map((m) => (
                    <Line
                      key={m}
                      type="monotone"
                      dataKey={m}
                      stroke={methodColors[m]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Latency Comparison Chart */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--apple-accent)] stroke-[1.75]" />
              <h3 className="text-title-3 font-semibold text-[var(--apple-label)]">
                Median Latency Comparison
              </h3>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyData}>
                  <CartesianGrid stroke="var(--apple-separator)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="method"
                    tick={{ fill: "var(--apple-secondary-label)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--apple-separator)" }}
                    tickLine={false}
                  />
                  <YAxis
                    scale="log"
                    domain={["auto", "auto"]}
                    tick={{ fill: "var(--apple-secondary-label)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--apple-separator)" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--apple-card)",
                      borderColor: "var(--apple-separator)",
                      borderRadius: "12px",
                      color: "var(--apple-label)",
                      fontSize: "12px",
                    }}
                    formatter={(val) => [`${val} ms`, "Median Latency"]}
                  />
                  <Bar dataKey="latency_ms" fill="var(--apple-accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ROC & PR Curve Section */}
      {rocPrData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ROC Curves */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--apple-accent)] stroke-[1.75]" />
                <h3 className="text-title-3 font-semibold text-[var(--apple-label)]">
                  Receiver Operating Characteristic (ROC)
                </h3>
              </div>
              <span className="text-caption text-[var(--apple-secondary-label)]">
                FPR vs. TPR
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rocPrData.rocCurve}>
                  <CartesianGrid stroke="var(--apple-separator)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[0, 1]}
                    tick={{ fill: "var(--apple-secondary-label)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--apple-separator)" }}
                    tickLine={false}
                    name="False Positive Rate"
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: "var(--apple-secondary-label)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--apple-separator)" }}
                    tickLine={false}
                    name="True Positive Rate"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--apple-card)",
                      borderColor: "var(--apple-separator)",
                      borderRadius: "12px",
                      color: "var(--apple-label)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(val) => {
                      const auc = rocPrData.aucByMethod[val]?.rocAuc ?? 0;
                      return `${val} (AUC ${auc.toFixed(3)})`;
                    }}
                  />
                  {Object.keys(methodColors)
                    .filter((m) => m !== "cascade")
                    .map((m) => (
                      <Line
                        key={m}
                        type="monotone"
                        dataKey={m}
                        stroke={methodColors[m]}
                        strokeWidth={1.75}
                        dot={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* PR Curves */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--apple-accent)] stroke-[1.75]" />
                <h3 className="text-title-3 font-semibold text-[var(--apple-label)]">
                  Precision-Recall (PR) Curves
                </h3>
              </div>
              <span className="text-caption text-[var(--apple-secondary-label)]">
                Recall vs. Precision
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rocPrData.prCurve}>
                  <CartesianGrid stroke="var(--apple-separator)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[0, 1]}
                    tick={{ fill: "var(--apple-secondary-label)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--apple-separator)" }}
                    tickLine={false}
                    name="Recall"
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: "var(--apple-secondary-label)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--apple-separator)" }}
                    tickLine={false}
                    name="Precision"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--apple-card)",
                      borderColor: "var(--apple-separator)",
                      borderRadius: "12px",
                      color: "var(--apple-label)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(val) => {
                      const auc = rocPrData.aucByMethod[val]?.prAuc ?? 0;
                      return `${val} (AUC ${auc.toFixed(3)})`;
                    }}
                  />
                  {Object.keys(methodColors)
                    .filter((m) => m !== "cascade")
                    .map((m) => (
                      <Line
                        key={m}
                        type="monotone"
                        dataKey={m}
                        stroke={methodColors[m]}
                        strokeWidth={1.75}
                        dot={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
