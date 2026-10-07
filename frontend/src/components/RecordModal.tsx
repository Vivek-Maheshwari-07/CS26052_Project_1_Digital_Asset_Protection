import React, { useEffect, useState } from "react";
import { getRegistrationRecord } from "../api/client";
import type { RegistrationRecord } from "../api/types";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { Copy, Download, Check } from "lucide-react";

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
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Registration Record"
      subtitle={`Image ID: ${imageId}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-caption text-[var(--apple-secondary-label)]">
            Cryptographic fingerprint receipt
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              disabled={loading || !record}
              icon={copied ? <Check className="w-3.5 h-3.5 stroke-[1.75]" /> : <Copy className="w-3.5 h-3.5 stroke-[1.75]" />}
            >
              {copied ? "Copied" : "Copy JSON"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              disabled={loading || !record}
              icon={<Download className="w-3.5 h-3.5 stroke-[1.75]" />}
            >
              Download Record
            </Button>
          </div>
        </div>
      }
    >
      <div className="font-mono text-footnote bg-[var(--apple-grouped-background)] p-4 rounded-[12px] border border-[var(--apple-separator)] text-[var(--apple-label)] max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[var(--apple-secondary-label)] space-x-2">
            <span className="text-subheadline">Loading Registration Record...</span>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-all tabular-nums">{jsonString}</pre>
        )}
      </div>
    </Sheet>
  );
};
