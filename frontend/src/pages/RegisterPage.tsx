import React, { useState } from "react";
import { registerImage } from "../api/client";
import type { RegisterResponse, ConflictResponse } from "../api/types";
import { ApiError } from "../api/client";
import { ImageDropzone } from "../components/ImageDropzone";
import { ConflictModal } from "../components/ConflictModal";
import { RecordModal } from "../components/RecordModal";
import { PillButton } from "../components/ui/PillButton";
import { Kicker } from "../components/ui/Kicker";
import { Sticker } from "../components/ui/Sticker";
import { Seal } from "../components/ui/Seal";
import { Marquee } from "../components/ui/Marquee";
import { BackgroundCircle } from "../components/ui/BackgroundCircle";
import { BitGrid } from "../components/ui/BitGrid";
import { InsetGroupedList } from "../components/ui/InsetGroupedList";
import { CheckCircle2, AlertCircle, Copy, Check, FileText, PlusCircle } from "lucide-react";
import { playTick, playMatchChime } from "../utils/sound";

export const RegisterPage: React.FC = () => {
  const [ownerName, setOwnerName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<RegisterResponse | null>(null);
  const [conflictData, setConflictData] = useState<ConflictResponse | null>(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please select an image file to register.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessData(null);
    setConflictData(null);

    try {
      const trimmedOwner = ownerName.trim() ? ownerName.trim() : undefined;
      const response = await registerImage(selectedFile, trimmedOwner);
      setSuccessData(response);
      playMatchChime();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 409 && (apiErr.conflictData || (apiErr as { data?: unknown }).data)) {
        setConflictData((apiErr.conflictData || (apiErr as { data?: unknown }).data) as ConflictResponse);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred during registration.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    playTick();
    setSuccessData(null);
    setConflictData(null);
    setSelectedFile(null);
    setOwnerName("");
    setErrorMsg(null);
  };

  const handleCopySha = (sha: string) => {
    playTick();
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  return (
    <div className="relative min-w-0 max-w-[1080px] mx-auto px-4 pt-24 pb-16 flex flex-col gap-12 z-10">
      <BackgroundCircle />

      {/* Editorial HERO */}
      <section className="relative flex flex-col gap-6 pt-4 pb-8 min-h-[50vh] justify-center">
        <div className="flex items-center gap-3 flex-wrap">
          <Kicker>● AN EMPIRICAL STUDY IN IMAGE PROVENANCE</Kicker>
          <Sticker variant="cobalt" rotate={-2}>
            CEUP 301 / CHARUSAT
          </Sticker>
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h1 className="font-display text-[clamp(44px,8vw,96px)] leading-[0.95] tracking-[-0.02em] text-(--ink) m-0 font-normal">
              Register your <span className="italic text-(--cobalt-text)">work</span>.
            </h1>
            <p className="text-[18px] text-(--ink-soft) max-w-[34ch] leading-relaxed m-0">
              Register images into the multi-stage provenance index with SHA-256 and perceptual embeddings.
            </p>
          </div>

          {/* Overlapping Rotating Seal */}
          <div className="hidden md:block self-center lg:-ml-12">
            <Seal size={140} />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      {!successData ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-8 bg-(--paper-2) border border-(--rule) rounded-[24px] p-6 md:p-10 shadow-hard relative z-10"
        >
          {/* Image Dropzone */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-(--ink-soft)">
              1. IMAGE FILE
            </label>
            <ImageDropzone
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              disabled={isLoading}
            />
          </div>

          {/* Owner Name Input (Optional) */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="owner-name-input"
              className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-(--ink-soft)"
            >
              2. CLAIMANT / OWNER NAME (OPTIONAL)
            </label>
            <input
              id="owner-name-input"
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Studio Alice, Photographer Bob (optional)"
              disabled={isLoading}
              className="h-14 px-5 bg-(--paper) border border-(--rule) rounded-xl font-mono text-[15px] text-(--ink) placeholder:text-(--ink-soft)/60 focus:border-(--cobalt) transition-colors"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div
              className="p-4 bg-(--vermilion)/10 border border-(--vermilion)/30 rounded-xl text-(--vermilion-text) font-mono text-[13px] flex items-center gap-2"
              role="alert"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2 border-t border-(--rule)">
            <span className="font-mono text-[12px] text-(--ink-soft) hidden sm:inline">
              Establishes an immutable timestamped index record.
            </span>
            <PillButton
              type="submit"
              disabled={isLoading || !selectedFile}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Indexing work..." : "Register work"}
            </PillButton>
          </div>
        </form>
      ) : (
        /* Printed Ticket Success Receipt */
        <section
          className="relative bg-(--paper-2) border-2 border-(--ink) rounded-[24px] p-6 md:p-10 shadow-hard-lg flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-200"
          aria-live="polite"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-dashed border-(--ink)">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-(--sage) text-(--paper) flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} strokeWidth={2.5} />
              </div>
              <div>
                <Sticker variant="sage" rotate={-1}>
                  INDEXED #201
                </Sticker>
                <h2 className="font-display text-[28px] md:text-[34px] font-normal text-(--ink) m-0">
                  Registration Complete.
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecordModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-(--paper) border border-(--rule) rounded-full font-mono text-[12px] font-bold uppercase text-(--ink) hover:bg-(--paper)/80 transition-colors"
              >
                <FileText size={15} />
                <span>View Record</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-(--ink) text-(--paper) rounded-full font-mono text-[12px] font-bold uppercase hover:bg-(--ink)/90 transition-colors"
              >
                <PlusCircle size={15} />
                <span>Register Another</span>
              </button>
            </div>
          </div>

          {/* Inset Grouped Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InsetGroupedList
              items={[
                {
                  label: "Image ID",
                  value: successData.image_id || (successData as unknown as { id: string }).id,
                },
                { label: "Owner Name", value: successData.owner_name, mono: false },
                {
                  label: "Timestamp",
                  value: new Date(
                    successData.registered_at ||
                      (successData as unknown as { created_at: string }).created_at
                  ).toLocaleString(),
                  mono: false,
                },
                {
                  label: "SHA-256 Digest",
                  value: (
                    <div className="flex items-center gap-2 justify-end">
                      <span className="truncate max-w-[140px]" title={successData.sha256}>
                        {successData.sha256.slice(0, 12)}...
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySha(successData.sha256)}
                        className="p-1 rounded-sm hover:bg-(--paper) text-(--cobalt-text)"
                        title="Copy SHA-256"
                      >
                        {copiedSha ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  ),
                },
              ]}
            />

            <InsetGroupedList
              items={[
                {
                  label: "Config Version",
                  value:
                    successData.models?.config_version ||
                    (successData as unknown as { config_version: string }).config_version ||
                    "1.0.0",
                },
                { label: "Models Active", value: "DINOv2-Base + CLIP ViT-B/32" },
                { label: "Hash Methods", value: "pHash, dHash, aHash, wHash (64-bit)" },
                { label: "Indexing Status", value: "HNSW + Bitwise Active" },
              ]}
            />
          </div>

          {/* 8x8 Bit Grids for Hashes */}
          <div>
            <div className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-(--ink-soft) mb-3">
              Perceptual Fingerprints (8×8 Bit Matrix Reveal)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <BitGrid
                hashHex={
                  successData.fingerprints?.phash ||
                  (successData as unknown as { phash: string }).phash ||
                  "0000000000000000"
                }
                name="pHash"
              />
              <BitGrid
                hashHex={
                  successData.fingerprints?.dhash ||
                  (successData as unknown as { dhash: string }).dhash ||
                  "0000000000000000"
                }
                name="dHash"
              />
              <BitGrid
                hashHex={
                  successData.fingerprints?.ahash ||
                  (successData as unknown as { ahash: string }).ahash ||
                  "0000000000000000"
                }
                name="aHash"
              />
              <BitGrid
                hashHex={
                  successData.fingerprints?.whash ||
                  (successData as unknown as { whash: string }).whash ||
                  "0000000000000000"
                }
                name="wHash"
              />
            </div>
          </div>

          {/* Footnote Disclaimer */}
          <div className="p-4 bg-(--paper) border border-(--rule) rounded-xl font-mono text-[12px] text-(--ink-soft) leading-relaxed">
            Note: Registration establishes indexing timestamp and perceptual
            fingerprint records; it is not proof of ownership or copyright.
          </div>
        </section>
      )}

      {/* Marquee */}
      <Marquee />

      {/* 409 Conflict Modal */}
      <ConflictModal
        isOpen={Boolean(conflictData)}
        conflictData={conflictData}
        onClose={() => setConflictData(null)}
      />

      {/* Record Inspection Modal */}
      <RecordModal
        isOpen={recordModalOpen}
        imageId={successData?.image_id || null}
        onClose={() => setRecordModalOpen(false)}
      />
    </div>
  );
};
