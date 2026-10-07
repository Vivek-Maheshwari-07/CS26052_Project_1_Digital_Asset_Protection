import React, { useState } from "react";
import { formatErrorMessage, registerImage } from "../api/client";
import type { ConflictResponse, RegisterResponse } from "../api/types";
import { ConflictModal } from "../components/ConflictModal";
import { ImageDropzone } from "../components/ImageDropzone";
import { RecordModal } from "../components/RecordModal";

export const RegisterPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ownerName, setOwnerName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<RegisterResponse | null>(null);
  const [conflictData, setConflictData] = useState<ConflictResponse | null>(null);
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [copiedSha, setCopiedSha] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please choose an image file to register.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessData(null);
    setConflictData(null);

    try {
      const data = await registerImage(selectedFile, ownerName);
      setSuccessData(data);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "conflictData" in err &&
        (err as { conflictData?: ConflictResponse }).conflictData
      ) {
        setConflictData((err as { conflictData: ConflictResponse }).conflictData);
      } else {
        setErrorMsg(formatErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const truncateHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const formatLocalDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Register Digital Asset
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Submit an image to compute multi-stage perceptual fingerprints and register its timestamped receipt.
        </p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dropzone */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Image Asset
          </label>
          <ImageDropzone
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            onError={setErrorMsg}
            disabled={loading}
          />
        </div>

        {/* Owner Name Input */}
        <div>
          <label
            htmlFor="owner-name-input"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Owner Name <span className="text-slate-400 font-normal">(Optional, max 100 chars)</span>
          </label>
          <input
            id="owner-name-input"
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value.slice(0, 100))}
            placeholder="e.g. Aarav Mehta / Studio Alpha"
            disabled={loading}
            maxLength={100}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start space-x-3 text-rose-800 dark:text-rose-200 text-sm">
            <svg className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-semibold">Registration Error: </span>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Submit Button */}
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
                <span>Registering Image...</span>
              </>
            ) : (
              <span>Submit for Registration</span>
            )}
          </button>
        </div>
      </form>

      {/* 201 Success Card */}
      {successData && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 shadow-lg space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Asset Successfully Registered
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registered at {formatLocalDate(successData.registered_at)}
                </p>
              </div>
            </div>

            {successData.low_detail && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                Low Detail Asset
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Image ID & SHA-256 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-slate-500 font-sans font-semibold uppercase tracking-wider text-[11px]">
                Identifiers
              </div>
              <div>
                <span className="text-slate-400">Image ID: </span>
                <span className="text-slate-800 dark:text-slate-200">{successData.image_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400">SHA-256: </span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold" title={successData.sha256}>
                    {truncateHash(successData.sha256)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopySha(successData.sha256)}
                  className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-sans text-[11px] transition"
                >
                  {copiedSha ? "Copied!" : "Copy Full SHA"}
                </button>
              </div>
              <div>
                <span className="text-slate-400">Dimensions: </span>
                <span className="text-slate-800 dark:text-slate-200">
                  {successData.width} × {successData.height} px
                </span>
              </div>
            </div>

            {/* Models Info */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-slate-500 font-sans font-semibold uppercase tracking-wider text-[11px]">
                Inference Engine
              </div>
              <div>
                <span className="text-slate-400">CLIP Model: </span>
                <span className="text-slate-800 dark:text-slate-200">{successData.models.clip}</span>
              </div>
              <div>
                <span className="text-slate-400">DINO Model: </span>
                <span className="text-slate-800 dark:text-slate-200">{successData.models.dino}</span>
              </div>
              <div>
                <span className="text-slate-400">Config Version: </span>
                <span className="text-slate-800 dark:text-slate-200">{successData.models.config_version}</span>
              </div>
            </div>
          </div>

          {/* Perceptual Fingerprints (16-char hex in monospace) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-slate-500 font-sans font-semibold uppercase tracking-wider text-[11px]">
              Perceptual Fingerprints (64-bit Hex)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">pHash</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{successData.fingerprints.phash}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">dHash</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{successData.fingerprints.dhash}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">aHash</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{successData.fingerprints.ahash}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">wHash</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{successData.fingerprints.whash}</div>
              </div>
            </div>
          </div>

          {/* Verbatim Disclaimer & Actions */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 max-w-lg italic">
              "This is a Registration Record, not proof of ownership or copyright."
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowRecordModal(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
              >
                View record
              </button>
              <a
                href={`/api/images/${encodeURIComponent(successData.image_id)}/record?download=true`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
              >
                Download record
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      {conflictData && (
        <ConflictModal
          conflict={conflictData}
          isOpen={true}
          onClose={() => setConflictData(null)}
        />
      )}

      {/* Record Modal */}
      {successData && showRecordModal && (
        <RecordModal
          imageId={successData.image_id}
          isOpen={showRecordModal}
          onClose={() => setShowRecordModal(false)}
        />
      )}
    </div>
  );
};
