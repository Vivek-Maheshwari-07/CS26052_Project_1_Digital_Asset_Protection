import React from "react";
import type { ConflictResponse } from "../api/types";

interface ConflictModalProps {
  conflict: ConflictResponse;
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflict,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const { reason, message, existing, thresholds } = conflict;

  const formatReason = (r: string) => {
    switch (r) {
      case "sha256":
        return "Exact SHA-256 Byte Match";
      case "hash":
        return "Perceptual Hash Collision (pHash distance ≤ threshold)";
      case "dino_cosine":
        return "Deep Visual Similarity (DINOv2 Cosine ≥ threshold)";
      default:
        return r;
    }
  };

  const formattedDate = new Date(existing.registered_at).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with warning banner */}
        <div className="px-6 py-4 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/80 dark:bg-rose-950/40 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-rose-900 dark:text-rose-200">
                Registration Conflict (409)
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                {formatReason(reason)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {message}
          </p>

          {/* Existing Image Card */}
          <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <img
              src={existing.thumbnail_url}
              alt="Existing registered asset"
              className="w-20 h-20 rounded-lg object-cover border border-slate-300 dark:border-slate-600 shadow-sm"
            />
            <div className="flex-1 space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Existing Registered Asset
              </div>
              <div className="text-xs font-mono text-slate-800 dark:text-slate-200 break-all">
                ID: {existing.image_id}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Registered: <span className="font-medium text-slate-700 dark:text-slate-300">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Side-by-side Evidence Panels (Rule: Never combine into one score/percentage) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Panel 1: Classical Hashes */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Classical hashes (Hamming /64)
                </h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Threshold ≤ {thresholds.hamming_conflict_max}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500">pHash:</span>
                  <span className={`font-bold ${existing.hamming.phash <= thresholds.hamming_conflict_max ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {existing.hamming.phash} / 64
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500">dHash:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {existing.hamming.dhash} / 64
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500">aHash:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {existing.hamming.ahash} / 64
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500">wHash:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {existing.hamming.whash} / 64
                  </span>
                </div>
              </div>
            </div>

            {/* Panel 2: Deep Embeddings */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Deep embeddings (cosine)
                </h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Threshold ≥ {thresholds.dino_cosine_conflict_min}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500">DINOv2 (768-d):</span>
                  <span className={`font-bold ${existing.cosine.dino !== null && existing.cosine.dino >= thresholds.dino_cosine_conflict_min ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {existing.cosine.dino !== null ? existing.cosine.dino.toFixed(4) : "—"}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500">CLIP (512-d):</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {existing.cosine.clip !== null ? existing.cosine.clip.toFixed(4) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
