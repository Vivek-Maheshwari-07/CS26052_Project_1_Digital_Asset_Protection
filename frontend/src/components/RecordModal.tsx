import React, { useEffect, useState } from "react";
import { getRegistrationRecord } from "../api/client";
import type { RegistrationRecord } from "../api/types";

interface RecordModalProps {
  imageId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  imageId,
  isOpen,
  onClose,
}) => {
  const [record, setRecord] = useState<RegistrationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (isOpen && imageId) {
      Promise.resolve().then(() => {
        if (mounted) setLoading(true);
      });

      getRegistrationRecord(imageId)
        .then((data) => {
          if (mounted) {
            setRecord(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load registration record:", err);
          if (mounted) {
            setLoading(false);
          }
        });
    }

    return () => {
      mounted = false;
    };
  }, [isOpen, imageId]);

  if (!isOpen) return null;

  const jsonString = record ? JSON.stringify(record, null, 2) : "";

  const handleCopy = () => {
    if (!jsonString) return;
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.open(`/api/images/${encodeURIComponent(imageId)}/record?download=true`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Registration Record
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Image ID: {imageId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-slate-100">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading Registration Record...
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-all">{jsonString}</pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Immutable fingerprint receipt
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              disabled={loading || !record}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
            >
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button
              onClick={handleDownload}
              disabled={loading || !record}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
            >
              Download Record (.json)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
