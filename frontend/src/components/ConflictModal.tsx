import React from "react";
import { Sheet } from "./ui/Sheet";
import { HammingPanel } from "./ui/HammingPanel";
import { CosinePanel } from "./ui/CosinePanel";
import { InsetGroupedList } from "./ui/InsetGroupedList";
import { FramedImage } from "./ui/FramedImage";
import type { ConflictResponse } from "../api/types";
import { AlertTriangle } from "lucide-react";

export interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: ConflictResponse | null;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  conflictData,
}) => {
  if (!conflictData) return null;

  const { existing, message } = conflictData;
  const existingId = existing?.image_id || "";
  const existingImageUrl = `/api/images/${existingId}/file?size=thumb`;

  const hammingScores =
    existing?.hamming || { phash: 0, dhash: 0, ahash: 0, whash: 0 };
  const cosineScores =
    existing?.cosine || { dino: null, clip: null };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Registration Conflict (409)"
      size="large"
    >
      <div className="flex flex-col gap-6">
        {/* Warning Banner */}
        <div className="p-4 bg-(--ochre)/20 border-2 border-(--ochre) rounded-xl flex items-start gap-3">
          <AlertTriangle size={22} className="text-(--ink) shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[13px] font-bold uppercase text-(--ink)">
              Duplicate / Near-Duplicate Detected
            </span>
            <span className="text-[14px] text-(--ink-soft)">{message}</span>
          </div>
        </div>

        {/* Existing Registered Work */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center p-4 bg-(--paper-2) border border-(--rule) rounded-2xl">
          <div className="flex justify-center">
            <FramedImage
              src={existingImageUrl}
              alt={`Existing image ${existingId}`}
              className="max-h-36"
              offset={10}
            />
          </div>
          <div className="sm:col-span-2">
            <InsetGroupedList
              items={[
                { label: "Existing ID", value: existingId },
                {
                  label: "Owner Name",
                  value: (existing as any)?.owner_name || "Registered Claimant",
                  mono: false,
                },
                {
                  label: "Registered At",
                  value: existing?.registered_at
                    ? new Date(existing.registered_at).toLocaleString()
                    : "—",
                  mono: false,
                },
              ]}
            />
          </div>
        </div>

        {/* Two Separate Panels Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HammingPanel scores={hammingScores} />
          <CosinePanel scores={cosineScores} />
        </div>

        <div className="p-3 bg-(--paper-2) border border-(--rule) rounded-xl font-mono text-[11px] text-(--ink-soft)">
          Note: An image with matching exact hash or near-threshold perceptual
          similarity cannot be re-registered as a new original.
        </div>
      </div>
    </Sheet>
  );
};
