import React from "react";
import { PaperCard } from "./PaperCard";
import { StatusPill } from "./StatusPill";
import type { CosineScores, EvidenceThresholds } from "../../api/types";
import { AlertCircle, Sparkles } from "lucide-react";

export interface CosinePanelProps {
  scores: CosineScores;
  thresholds?: EvidenceThresholds;
  isLoading?: boolean;
  error?: string | null;
  isOnDemand?: boolean;
  className?: string;
}

export const CosinePanel: React.FC<CosinePanelProps> = ({
  scores,
  thresholds,
  isLoading = false,
  error = null,
  isOnDemand = false,
  className = "",
}) => {
  const deepList = [
    {
      key: "dino",
      label: "DINOv2 (ViT-B/14)",
      val: scores.dino,
      thresh: thresholds?.dino ?? 0.82,
    },
    {
      key: "clip",
      label: "CLIP (ViT-B/32)",
      val: scores.clip,
      thresh: thresholds?.clip ?? 0.88,
    },
  ];

  return (
    <PaperCard className={`flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-center justify-between border-b border-(--rule) pb-3 mb-4">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--ochre)">
              DEEP EMBEDDINGS
            </div>
            <h3 className="font-display text-[20px] font-normal text-(--ink) m-0">
              Cosine Similarity ([-1, 1])
            </h3>
          </div>
          <span className="font-mono text-[11px] text-(--ink-soft) uppercase">
            Higher is closer
          </span>
        </div>

        {error ? (
          <div className="p-4 bg-(--vermilion)/10 border border-(--vermilion)/30 rounded-xl text-(--vermilion) font-mono text-[12px] flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            <div className="p-4 bg-(--paper) border border-(--rule) rounded-xl h-28 flex flex-col justify-between">
              <div className="h-3 bg-(--rule) rounded-xs w-16" />
              <div className="h-7 bg-(--rule) rounded-xs w-24" />
            </div>
            <div className="p-4 bg-(--paper) border border-(--rule) rounded-xl h-28 flex flex-col justify-between">
              <div className="h-3 bg-(--rule) rounded-xs w-16" />
              <div className="h-7 bg-(--rule) rounded-xs w-24" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {deepList.map((item) => {
              const isComputed = item.val !== null && item.val !== undefined;
              const isPass = isComputed && item.val! >= item.thresh;
              return (
                <div
                  key={item.key}
                  className="p-3 bg-(--paper) border border-(--rule) rounded-xl flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[12px] font-bold text-(--ink-soft) uppercase truncate">
                      {item.label}
                    </span>
                    {isComputed ? (
                      <StatusPill
                        status={isPass ? "pass" : "fail"}
                        label={isPass ? "✓ Pass" : "✕ Fail"}
                      />
                    ) : (
                      <StatusPill status="neutral" label="Skipped" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-mono tabular-nums text-[26px] font-bold text-(--ink)">
                      {isComputed ? item.val!.toFixed(4) : "—"}
                    </span>
                    <span className="font-mono text-[11px] text-(--ink-soft)">
                      (≥ {item.thresh.toFixed(2)})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-(--rule) font-mono text-[11px] text-(--ink-soft) flex items-center justify-between">
        {isOnDemand ? (
          <span className="text-(--cobalt) font-semibold flex items-center gap-1">
            <Sparkles size={13} />
            Computed on demand: does not change the verdict.
          </span>
        ) : (
          <span>Rule: cosine ≥ threshold qualifies candidate in Stage 3.</span>
        )}
      </div>
    </PaperCard>
  );
};
