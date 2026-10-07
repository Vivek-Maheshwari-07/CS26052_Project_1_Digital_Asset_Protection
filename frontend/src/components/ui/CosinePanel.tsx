import React from "react";
import type { CosineScores } from "../../api/types";
import { StatusPill } from "./StatusPill";
import { Sparkles, AlertCircle } from "lucide-react";

export interface CosinePanelProps {
  scores: CosineScores;
  thresholds?: {
    dino?: number | null;
    clip?: number | null;
  };
  title?: string;
  loading?: boolean;
  error?: string | null;
  computedOnDemand?: boolean;
  className?: string;
}

export const CosinePanel: React.FC<CosinePanelProps> = ({
  scores,
  thresholds = { dino: 0.9, clip: 0.9 },
  title = "Deep Embeddings (Cosine)",
  loading = false,
  error = null,
  computedOnDemand = false,
  className = "",
}) => {
  const deepList = [
    { key: "dino" as const, name: "DINOv2 (Vision)", val: scores.dino, thresh: thresholds.dino ?? 0.9 },
    { key: "clip" as const, name: "CLIP (Multimodal)", val: scores.clip, thresh: thresholds.clip ?? 0.9 },
  ];

  return (
    <div
      className={`bg-[var(--apple-card)] rounded-[16px] border border-[var(--apple-separator)] p-5 shadow-[var(--apple-card-shadow)] space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-headline font-semibold text-[var(--apple-label)]">{title}</h3>
          {computedOnDemand && (
            <span
              title="Computed on demand"
              className="text-[var(--apple-accent)] inline-flex items-center"
            >
              <Sparkles className="w-3.5 h-3.5 stroke-[1.75]" />
            </span>
          )}
        </div>
        <span className="text-caption text-[var(--apple-secondary-label)]">Higher is closer</span>
      </div>

      {error ? (
        <div className="bg-[var(--apple-danger-subtle)] border border-[var(--apple-danger)]/20 rounded-[12px] p-3 text-caption text-[var(--apple-danger)] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.75]" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-[var(--apple-grouped-background)] rounded-[12px] p-3 border border-[var(--apple-separator)] animate-pulse space-y-2"
            >
              <div className="h-4 bg-[var(--apple-separator)] rounded w-1/2" />
              <div className="h-8 bg-[var(--apple-separator)] rounded w-3/4" />
              <div className="h-3 bg-[var(--apple-separator)] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {deepList.map((item) => {
            const hasVal = item.val !== null && item.val !== undefined;
            const isMatch = hasVal && (item.val as number) >= item.thresh;

            return (
              <div
                key={item.key}
                className="bg-[var(--apple-grouped-background)] rounded-[12px] p-3 border border-[var(--apple-separator)] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-caption font-medium text-[var(--apple-secondary-label)]">
                    {item.name}
                  </span>
                  {hasVal ? (
                    <StatusPill
                      size="sm"
                      status={isMatch ? "pass" : "fail"}
                      label={isMatch ? "Pass" : "Fail"}
                    />
                  ) : (
                    <StatusPill size="sm" status="none" label="— not computed" />
                  )}
                </div>
                <div className="text-title-2 font-bold tabular-nums text-[var(--apple-label)]">
                  {hasVal ? (item.val as number).toFixed(4) : "—"}
                </div>
                <div className="text-[11px] text-[var(--apple-secondary-label)] mt-0.5">
                  Threshold: ≥{item.thresh.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {computedOnDemand && !loading && !error && (
        <p className="text-caption text-[var(--apple-secondary-label)]">
          Computed on demand: does not change the verdict.
        </p>
      )}
    </div>
  );
};
