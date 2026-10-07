import React, { useEffect, useState } from "react";
import { Sheet } from "./ui/Sheet";
import { BitGrid } from "./ui/BitGrid";
import { InsetGroupedList } from "./ui/InsetGroupedList";
import { getImageRecord } from "../api/client";
import type { RegistrationRecord } from "../api/types";
import { AlertCircle, Copy, Check } from "lucide-react";
import { playTick } from "../utils/sound";

export interface RecordModalProps {
  isOpen: boolean;
  imageId: string | null;
  onClose: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  imageId,
  onClose,
}) => {
  const [record, setRecord] = useState<RegistrationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!isOpen || !imageId) {
      queueMicrotask(() => {
        if (isMounted) {
          setRecord(null);
          setError(null);
        }
      });
      return;
    }
    queueMicrotask(() => {
      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }
    });

    getImageRecord(imageId)
      .then((rec) => {
        if (isMounted) setRecord(rec);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch registration record."
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, imageId]);

  const handleCopySha = (sha: string) => {
    playTick();
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Image Registration Record"
      size="large"
    >
      {isLoading ? (
        <div className="py-12 text-center font-mono text-[14px] text-(--ink-soft) animate-pulse">
          Retrieving registration record from index...
        </div>
      ) : error ? (
        <div className="p-4 bg-(--vermilion)/10 border border-(--vermilion)/30 rounded-xl text-(--vermilion) font-mono text-[13px] flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : record ? (
        <div className="flex flex-col gap-6">
          {/* Metadata */}
          <InsetGroupedList
            items={[
              { label: "Image ID", value: record.image_id },
              { label: "Owner Name", value: record.owner_name, mono: false },
              {
                label: "Registered At",
                value: new Date(record.registered_at).toLocaleString(),
                mono: false,
              },
              {
                label: "SHA-256 Digest",
                value: (
                  <div className="flex items-center gap-2 justify-end">
                    <span className="truncate max-w-[200px]" title={record.sha256}>
                      {record.sha256.slice(0, 16)}...
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopySha(record.sha256)}
                      className="p-1 rounded-sm hover:bg-(--paper) text-(--cobalt)"
                      title="Copy SHA-256"
                    >
                      {copiedSha ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                ),
              },
              { label: "Config Version", value: record.models.config_version },
            ]}
          />

          {/* 8x8 Bit Grids for Hashes */}
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--ink-soft) mb-3">
              Perceptual Hash Bit-Grids (64-bit)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <BitGrid hashHex={record.fingerprints.phash} name="pHash" />
              <BitGrid hashHex={record.fingerprints.dhash} name="dHash" />
              <BitGrid hashHex={record.fingerprints.ahash} name="aHash" />
              <BitGrid hashHex={record.fingerprints.whash} name="wHash" />
            </div>
          </div>

          <div className="p-3 bg-(--paper-2) border border-(--rule) rounded-xl font-mono text-[11px] text-(--ink-soft) leading-relaxed">
            Note: Registration establishes indexing timestamp and perceptual
            fingerprint records; it is not proof of ownership or copyright.
          </div>
        </div>
      ) : null}
    </Sheet>
  );
};
