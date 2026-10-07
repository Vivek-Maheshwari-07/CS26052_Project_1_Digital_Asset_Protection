import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatErrorMessage, verifyImage } from "../api/client";
import type {
  Candidate,
  EmbeddingStage,
  HashStage,
  Sha256Stage,
  VerifyResponse,
} from "../api/types";
import { ImageDropzone } from "../components/ImageDropzone";
import { useQueryImage } from "../context/useQueryImage";

export const VerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const { setQueryData } = useQueryImage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please select an image file to verify.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setVerifyResult(null);

    try {
      const res = await verifyImage(selectedFile);
      setVerifyResult(res);
      setQueryData(selectedFile, res);
    } catch (err: unknown) {
      setErrorMsg(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getDecidedByLabel = (decidedBy: string) => {
    switch (decidedBy) {
      case "sha256":
        return "Decided by: SHA-256";
      case "hash":
        return "Decided by: Hash";
      case "embedding":
        return "Decided by: Embedding";
      case "none":
        return "Decided by: No match";
      default:
        return `Decided by: ${decidedBy}`;
    }
  };

  const getDecidedByBadgeColor = (decidedBy: string, verdict: string) => {
    if (verdict === "no_match") {
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
    }
    switch (decidedBy) {
      case "sha256":
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "hash":
        return "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "embedding":
        return "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
    }
  };

  // Stage retrieval helpers
  const shaStage =
    verifyResult?.stages.find((s): s is Sha256Stage => s.stage === "sha256") || null;
  const hashStage =
    verifyResult?.stages.find((s): s is HashStage => s.stage === "hash") || null;
  const embStage =
    verifyResult?.stages.find((s): s is EmbeddingStage => s.stage === "embedding") || null;

  const evidenceThresholds = verifyResult?.thresholds?.evidence || {
    phash: 8,
    dhash: 8,
    ahash: 8,
    whash: 8,
    dino: 0.9,
    clip: 0.9,
  };

  const handleOpenEvidence = (candidateId: string) => {
    if (!verifyResult) return;
    navigate(`/evidence/${verifyResult.verification_id}?candidate=${encodeURIComponent(candidateId)}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Verify Query Asset
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Perform multi-stage cascade verification (SHA-256 → Perceptual Hash → Deep Embeddings) against the registry.
        </p>
      </div>

      {/* Verification Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Query Image
          </label>
          <ImageDropzone
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            onError={setErrorMsg}
            disabled={loading}
          />
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start space-x-3 text-rose-800 dark:text-rose-200 text-sm">
            <svg className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-semibold">Verification Error: </span>
              {errorMsg}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition flex items-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Evaluating Cascade...</span>
              </>
            ) : (
              <span>Run Verification</span>
            )}
          </button>
        </div>
      </form>

      {/* Progress / Cascade Execution Steps Indicator */}
      {(loading || verifyResult) && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Cascade Execution Pipeline
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1: SHA-256 Exact */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                loading
                  ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-75"
                  : shaStage?.hit
                  ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-800 dark:text-slate-200">1. SHA-256 Exact</span>
                {shaStage ? (
                  <span className="font-mono text-[11px] text-slate-500">{shaStage.latency_ms}ms</span>
                ) : (
                  loading && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                )}
              </div>
              <div className="text-xs">
                {shaStage ? (
                  shaStage.hit ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Exact Match (Exit)</span>
                  ) : (
                    <span className="text-slate-500">Miss (Proceed)</span>
                  )
                ) : (
                  <span className="text-slate-400">Evaluating...</span>
                )}
              </div>
            </div>

            {/* Step 2: Perceptual Hashes */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                loading
                  ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-75"
                  : hashStage?.confident
                  ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : hashStage
                  ? "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-800 dark:text-slate-200">2. Hash Check (SQL)</span>
                {hashStage ? (
                  <span className="font-mono text-[11px] text-slate-500">{hashStage.latency_ms}ms</span>
                ) : null}
              </div>
              <div className="text-xs">
                {hashStage ? (
                  hashStage.confident ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Confident Match (d_H={hashStage.best_phash_hamming ?? "—"})
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Escalated (d_H={hashStage.best_phash_hamming ?? "—"})
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">{shaStage?.hit ? "Skipped" : "Waiting..."}</span>
                )}
              </div>
            </div>

            {/* Step 3: Deep Embedding */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                loading
                  ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-75"
                  : embStage?.passed
                  ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : embStage
                  ? "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-800 dark:text-slate-200">3. Embedding (DINO/CLIP)</span>
                {embStage ? (
                  <span className="font-mono text-[11px] text-slate-500">{embStage.latency_ms}ms</span>
                ) : null}
              </div>
              <div className="text-xs">
                {embStage ? (
                  embStage.passed ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Match (cos={embStage.best_dino_cosine?.toFixed(4) ?? "—"})
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">
                      No match (cos={embStage.best_dino_cosine?.toFixed(4) ?? "—"})
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">{verifyResult ? "Skipped (Hash Exit)" : "Waiting..."}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verdict Banner & Candidate List */}
      {verifyResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Verdict Banner */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  verifyResult.verdict === "match"
                    ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                {verifyResult.verdict === "match" ? "✓" : "✗"}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 capitalize">
                  Verdict: {verifyResult.verdict === "match" ? "Match Found" : "No Match Found"}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Verification ID: {verifyResult.verification_id}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDecidedByBadgeColor(
                  verifyResult.decided_by,
                  verifyResult.verdict,
                )}`}
              >
                {getDecidedByLabel(verifyResult.decided_by)}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {verifyResult.latency_ms} ms
              </span>
            </div>
          </div>

          {/* Candidate List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Matched Candidates ({verifyResult.candidates.length})
            </h3>

            {verifyResult.candidates.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
                No registered image matched the query within threshold tolerances.
              </div>
            ) : (
              verifyResult.candidates.map((cand: Candidate) => {
                const regDate = new Date(cand.registered_at).toLocaleString();

                return (
                  <div
                    key={cand.image_id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    {/* Candidate Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3.5">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                          #{cand.rank}
                        </span>
                        <img
                          src={cand.thumbnail_url}
                          alt="Candidate thumbnail"
                          className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {cand.owner_name || "Anonymous Owner"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            ID: {cand.image_id}
                          </div>
                          <div className="text-[11px] text-slate-400">Registered: {regDate}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEvidence(cand.image_id)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition flex items-center justify-center space-x-1 self-start sm:self-center"
                      >
                        <span>Open evidence</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Dual Panels: Hashes vs Embeddings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
                      {/* Classical Hashes */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-sans font-semibold uppercase text-slate-500">
                          <span>Classical Hashes (Hamming /64)</span>
                          {cand.above_threshold.hash && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Hash Match ✓</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400">pHash:</span>
                            <span
                              className={`font-bold ${
                                cand.hamming.phash <= (evidenceThresholds.phash ?? 8)
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {cand.hamming.phash}
                            </span>
                          </div>
                          <div className="flex justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400">dHash:</span>
                            <span
                              className={`font-bold ${
                                cand.hamming.dhash <= (evidenceThresholds.dhash ?? 8)
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {cand.hamming.dhash}
                            </span>
                          </div>
                          <div className="flex justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400">aHash:</span>
                            <span
                              className={`font-bold ${
                                cand.hamming.ahash <= (evidenceThresholds.ahash ?? 8)
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {cand.hamming.ahash}
                            </span>
                          </div>
                          <div className="flex justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400">wHash:</span>
                            <span
                              className={`font-bold ${
                                cand.hamming.whash <= (evidenceThresholds.whash ?? 8)
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {cand.hamming.whash}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Deep Cosines */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-sans font-semibold uppercase text-slate-500">
                          <span>Deep Embeddings (Cosine)</span>
                          {cand.above_threshold.dino === true && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">DINO Match ✓</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400">DINOv2 (768-d):</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {cand.cosine.dino !== null ? cand.cosine.dino.toFixed(4) : "— not computed"}
                            </span>
                          </div>
                          <div className="flex justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400">CLIP (512-d):</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {cand.cosine.clip !== null ? cand.cosine.clip.toFixed(4) : "— not computed"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
