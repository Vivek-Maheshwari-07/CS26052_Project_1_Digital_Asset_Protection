import React from "react";
import type { HammingScores } from "../../api/types";
import { StatusPill } from "./StatusPill";

export interface HammingPanelProps {
  scores: HammingScores;
  thresholds?: {
    phash?: number | null;
    dhash?: number | null;
    ahash?: number | null;
    whash?: number | null;
  };
  title?: string;
  className?: string;
}

export const HammingPanel: React.FC<HammingPanelProps> = ({
  scores,
  thresholds = { phash: 8, dhash: 8, ahash: 8, whash: 8 },
  title = "Classical Hashes (Hamming /64)",
  className = "",
}) => {
  const hashList = [
    { key: "phash" as const, name: "pHash (DCT)", val: scores.phash, thresh: thresholds.phash ?? 8 },
    { key: "dhash" as const, name: "dHash (Grad)", val: scores.dhash, thresh: thresholds.dhash ?? 8 },
    { key: "ahash" as const, name: "aHash (Avg)", val: scores.ahash, thresh: thresholds.ahash ?? 8 },
    { key: "whash" as const, name: "wHash (Wavelet)", val: scores.whash, thresh: thresholds.whash ?? 8 },
  ];

  return (
    <div
      className={`bg-[var(--apple-card)] rounded-[16px] border border-[var(--apple-separator)] p-5 shadow-[var(--apple-card-shadow)] space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-headline font-semibold text-[var(--apple-label)]">{title}</h3>
        <span className="text-caption text-[var(--apple-secondary-label)]">Lower is closer</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {hashList.map((item) => {
          const isMatch = item.val <= item.thresh;
          return (
            <div
              key={item.key}
              className="bg-[var(--apple-grouped-background)] rounded-[12px] p-3 border border-[var(--apple-separator)] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-caption font-medium text-[var(--apple-secondary-label)]">
                  {item.name}
                </span>
                <StatusPill
                  size="sm"
                  status={isMatch ? "pass" : "fail"}
                  label={isMatch ? "Pass" : "Fail"}
                />
              </div>
              <div className="text-title-2 font-bold tabular-nums text-[var(--apple-label)]">
                {item.val} / 64
              </div>
              <div className="text-[11px] text-[var(--apple-secondary-label)] mt-0.5">
                Threshold: ≤{item.thresh}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
