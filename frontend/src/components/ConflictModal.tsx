import React from "react";
import type { ConflictResponse } from "../api/types";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { HammingPanel } from "./ui/HammingPanel";
import { CosinePanel } from "./ui/CosinePanel";
import { AlertCircle, Calendar, Fingerprint } from "lucide-react";

interface ConflictModalProps {
  conflict: ConflictResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflict,
  isOpen,
  onClose,
}) => {
  if (!conflict) return null;

  const getReasonText = (reason: string) => {
    switch (reason) {
      case "sha256":
        return "Exact byte-for-byte SHA-256 duplicate match";
      case "hash":
        return "Near-duplicate match detected via perceptual hash distance threshold";
      case "dino_cosine":
        return "Deep visual feature collision exceeding DINOv2 cosine similarity threshold";
      default:
        return conflict.message || "Near-duplicate collision detected";
    }
  };

  const registeredDateStr = new Date(conflict.existing.registered_at).toLocaleString();

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Registration Conflict (409)"
      subtitle="Registration rejected: this image matches an existing registered asset."
      maxWidth="xl"
      footer={
        <Button variant="secondary" size="md" onClick={onClose}>
          Dismiss
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-4 rounded-[12px] bg-[var(--apple-warning-subtle)] border border-[var(--apple-warning)]/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--apple-warning)] shrink-0 mt-0.5 stroke-[1.75]" />
          <div>
            <h4 className="text-subheadline font-semibold text-[var(--apple-label)]">
              Conflict Reason: {conflict.reason}
            </h4>
            <p className="text-footnote text-[var(--apple-secondary-label)] mt-0.5">
              {getReasonText(conflict.reason)}
            </p>
          </div>
        </div>

        {/* Existing Registered Asset Details */}
        <div className="bg-[var(--apple-grouped-background)] p-4 rounded-[14px] border border-[var(--apple-separator)] flex flex-col sm:flex-row items-center gap-4">
          <img
            src={conflict.existing.thumbnail_url}
            alt="Existing registered asset"
            className="w-24 h-24 object-cover rounded-[10px] border border-[var(--apple-separator)] bg-[var(--apple-card)] shadow-sm"
          />
          <div className="space-y-1.5 flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-footnote text-[var(--apple-secondary-label)]">
              <Fingerprint className="w-4 h-4 stroke-[1.75]" />
              <span>Existing Image ID:</span>
              <span className="font-mono text-[var(--apple-label)] select-all font-medium">
                {conflict.existing.image_id}
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-footnote text-[var(--apple-secondary-label)]">
              <Calendar className="w-4 h-4 stroke-[1.75]" />
              <span>Registered on:</span>
              <span className="font-medium text-[var(--apple-label)]">
                {registeredDateStr}
              </span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel 1: Classical Hashes */}
          <HammingPanel
            scores={conflict.existing.hamming}
            thresholds={{
              phash: conflict.thresholds.hamming_conflict_max,
              dhash: conflict.thresholds.hamming_conflict_max,
              ahash: conflict.thresholds.hamming_conflict_max,
              whash: conflict.thresholds.hamming_conflict_max,
            }}
            title="Classical hashes (Hamming /64)"
          />

          {/* Panel 2: Deep Embeddings */}
          <CosinePanel
            scores={conflict.existing.cosine}
            thresholds={{
              dino: conflict.thresholds.dino_cosine_conflict_min,
              clip: 0.9,
            }}
            title="Deep embeddings (cosine)"
          />
        </div>
      </div>
    </Sheet>
  );
};
