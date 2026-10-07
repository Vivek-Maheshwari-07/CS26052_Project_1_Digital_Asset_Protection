import React from "react";
import { PaperCard } from "./PaperCard";
import { StatusPill } from "./StatusPill";
import type { HammingScores, EvidenceThresholds } from "../../api/types";

export interface HammingPanelProps {
  scores: HammingScores;
  thresholds?: EvidenceThresholds;
  className?: string;
}

export const HammingPanel: React.FC<HammingPanelProps> = ({
  scores,
  thresholds,
  className = "",
}) => {
  const hashList = [
    { key: "phash", label: "pHash", val: scores.phash, thresh: thresholds?.phash ?? 10 },
    { key: "dhash", label: "dHash", val: scores.dhash, thresh: thresholds?.dhash ?? 10 },
    { key: "ahash", label: "aHash", val: scores.ahash, thresh: thresholds?.ahash ?? 10 },
    { key: "whash", label: "wHash", val: scores.whash, thresh: thresholds?.whash ?? 10 },
  ];

  return (
    <PaperCard className={`flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-center justify-between border-b border-(--rule) pb-3 mb-4">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--cobalt-text)">
              CLASSICAL FINGERPRINTS
            </div>
            <h3 className="font-display text-[20px] font-normal text-(--ink) m-0">
              Hamming Distances (/64)
            </h3>
          </div>
          <span className="font-mono text-[11px] text-(--ink-soft) uppercase">
            Lower is closer
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {hashList.map((item) => {
            const isPass = item.val != null && item.val <= item.thresh;
            return (
              <div
                key={item.key}
                className="p-3 bg-(--paper) border border-(--rule) rounded-xl flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[12px] font-bold text-(--ink-soft) uppercase">
                    {item.label}
                  </span>
                  <StatusPill
                    status={isPass ? "pass" : "fail"}
                    label={isPass ? "✓ Pass" : "✕ Fail"}
                  />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono tabular-nums text-[26px] font-bold text-(--ink)">
                    {item.val != null ? item.val : "—"}
                  </span>
                  <span className="font-mono text-[11px] text-(--ink-soft)">
                    / 64 (≤ {item.thresh})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-(--rule) font-mono text-[11px] text-(--ink-soft)">
        <span>Rule: distance ≤ threshold qualifies candidate in Stage 1.</span>
      </div>
    </PaperCard>
  );
};
