import React, { useState } from "react";
import { Link } from "react-router-dom";
import { verifyImage } from "../api/client";
import type { VerifyResponse } from "../api/types";
import { useQueryImage } from "../context/useQueryImage";
import { ImageDropzone } from "../components/ImageDropzone";
import { PillButton } from "../components/ui/PillButton";
import { Kicker } from "../components/ui/Kicker";
import { Sticker } from "../components/ui/Sticker";
import { Seal } from "../components/ui/Seal";
import { Stamp } from "../components/ui/Stamp";
import { Marquee } from "../components/ui/Marquee";
import { BackgroundCircle } from "../components/ui/BackgroundCircle";
import { TicketStub } from "../components/ui/TicketStub";
import { FramedImage } from "../components/ui/FramedImage";
import { HammingPanel } from "../components/ui/HammingPanel";
import { CosinePanel } from "../components/ui/CosinePanel";
import { InsetGroupedList } from "../components/ui/InsetGroupedList";
import { DecidedByBadge } from "../components/ui/DecidedByBadge";
import { AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { playMatchChime, playNoMatchThud, playTick } from "../utils/sound";

export const VerifyPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const { setVerificationData } = useQueryImage();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please upload an image to verify.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setVerifyResult(null);

    try {
      const response = await verifyImage(selectedFile);
      setVerifyResult(response);
      if (setVerificationData) {
        setVerificationData(selectedFile, response);
      }

      if (response.verdict === "match") {
        playMatchChime();
      } else {
        playNoMatchThud();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Verification failed due to an unexpected error.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    playTick();
    setVerifyResult(null);
    setSelectedFile(null);
    setErrorMsg(null);
  };

  return (
    <div className="relative min-w-0 max-w-[1080px] mx-auto px-4 pt-24 pb-16 flex flex-col gap-12 z-10">
      <BackgroundCircle />

      {/* Editorial HERO */}
      <section className="relative flex flex-col gap-6 pt-4 pb-8 min-h-[50vh] justify-center">
        <div className="flex items-center gap-3 flex-wrap">
          <Kicker>● 3-STAGE HYBRID CASCADE PROVENANCE</Kicker>
          <Sticker variant="cobalt" rotate={1}>
            PROVNET VERIFY
          </Sticker>
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h1 className="font-display text-[clamp(44px,8vw,96px)] leading-[0.95] tracking-[-0.02em] text-(--ink) m-0 font-normal">
              Verify an <span className="italic text-(--cobalt)">image</span>.
            </h1>
            <p className="text-[18px] text-(--ink-soft) max-w-[34ch] leading-relaxed m-0">
              Test images across the 3-stage cascade: exact SHA-256, 4x perceptual hashes, and deep embeddings.
            </p>
          </div>

          {/* Overlapping Rotating Seal */}
          <div className="hidden md:block self-center lg:-ml-12">
            <Seal size={140} />
          </div>
        </div>
      </section>

      {/* Upload Form */}
      {!verifyResult && (
        <form
          onSubmit={handleVerify}
          className="flex flex-col gap-8 bg-(--paper-2) border border-(--rule) rounded-[24px] p-6 md:p-10 shadow-hard relative z-10"
        >
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-(--ink-soft)">
              QUERY IMAGE FILE
            </label>
            <ImageDropzone
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              disabled={isLoading}
            />
          </div>

          {errorMsg && (
            <div
              className="p-4 bg-(--vermilion)/10 border border-(--vermilion)/30 rounded-xl text-(--vermilion) font-mono text-[13px] flex items-center gap-2"
              role="alert"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-(--rule)">
            <span className="font-mono text-[12px] text-(--ink-soft) hidden sm:inline">
              Executes exact match, perceptual distance, and deep embeddings.
            </span>
            <PillButton
              type="submit"
              disabled={isLoading || !selectedFile}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Running cascade..." : "Verify image"}
            </PillButton>
          </div>
        </form>
      )}

      {/* Verification Results */}
      {verifyResult && (
        <section
          className="flex flex-col gap-10 relative z-10 animate-in fade-in zoom-in-95 duration-200"
          aria-live="polite"
        >
          {/* Cascade 3 Ticket Stubs */}
          {(() => {
            const stagesArray = Array.isArray(verifyResult.stages) ? verifyResult.stages : [];
            const stagesObj = !Array.isArray(verifyResult.stages)
              ? (verifyResult.stages as Record<string, any>)
              : undefined;

            const shaStage =
              (stagesArray.find((s) => s.stage === "sha256") as any) ?? stagesObj?.sha256;
            const hashStage =
              (stagesArray.find((s) => s.stage === "hash") as any) ?? stagesObj?.hash;
            const embeddingStage =
              (stagesArray.find((s) => s.stage === "embedding") as any) ?? stagesObj?.embedding;

            const isShaMatch = Boolean(shaStage?.hit || shaStage?.matched);
            const isHashSkipped = !hashStage || hashStage?.status === "skipped";
            const isHashMatch = !isHashSkipped && Boolean(hashStage?.confident || hashStage?.matched);
            const isEmbeddingSkipped =
              !embeddingStage || embeddingStage?.status === "skipped";
            const isEmbeddingMatch =
              !isEmbeddingSkipped && Boolean(embeddingStage?.passed || embeddingStage?.matched);

            return (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-(--ink-soft)">
                    CASCADE PIPELINE (3 STAGES)
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 font-mono text-[12px] font-bold uppercase text-(--cobalt) hover:underline"
                  >
                    <RefreshCw size={13} />
                    <span>Verify another</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <TicketStub
                    name="STAGE 0 · SHA-256"
                    status={isShaMatch ? "match" : "miss"}
                    latencyMs={shaStage?.latency_ms}
                    detail={isShaMatch ? "Exact bitwise match" : "No bitwise identical match"}
                    delayIndex={0}
                  />
                  <TicketStub
                    name="STAGE 1 · HASH"
                    status={
                      isHashSkipped
                        ? "skipped"
                        : isHashMatch
                        ? "match"
                        : "no_match"
                    }
                    latencyMs={hashStage?.latency_ms}
                    detail={
                      isHashSkipped
                        ? undefined
                        : hashStage?.best_phash_hamming != null
                        ? `best d_H=${hashStage.best_phash_hamming}`
                        : `${hashStage?.candidates_evaluated ?? 1} candidates evaluated`
                    }
                    delayIndex={1}
                  />
                  <TicketStub
                    name="STAGE 2 · EMBEDDING"
                    status={
                      isEmbeddingSkipped
                        ? "skipped"
                        : isEmbeddingMatch
                        ? "match"
                        : "no_match"
                    }
                    latencyMs={embeddingStage?.latency_ms}
                    detail={
                      isEmbeddingSkipped
                        ? undefined
                        : embeddingStage?.best_dino_cosine != null
                        ? `cosine=${embeddingStage.best_dino_cosine.toFixed(4)}`
                        : "DINOv2 + CLIP similarity"
                    }
                    delayIndex={2}
                  />
                </div>
              </div>
            );
          })()}

          {/* Verdict Banner Row */}
          <div className="bg-(--paper-2) border-2 border-(--ink) rounded-[24px] p-6 md:p-8 shadow-hard flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Stamp
                verdict={
                  verifyResult.verdict === "match"
                    ? "match"
                    : "no_match"
                }
                size={110}
              />

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DecidedByBadge decidedBy={verifyResult.decided_by} />
                  <span className="font-mono text-[12px] text-(--ink-soft) tabular-nums">
                    Total: {verifyResult.latency_ms.toFixed(1)} ms
                  </span>
                </div>
                <h2 className="font-display text-[32px] md:text-[40px] font-normal text-(--ink) m-0">
                  {verifyResult.verdict === "match"
                    ? "Match found."
                    : "No match found."}
                </h2>
                <span className="font-mono text-[13px] text-(--ink-soft)">
                  Session: {verifyResult.verification_id}
                </span>
              </div>
            </div>

            {/* Inspect Evidence Button */}
            <Link
              to={`/evidence/${verifyResult.verification_id}${
                verifyResult.candidates.length > 0
                  ? `?candidate=${verifyResult.candidates[0].image_id}`
                  : ""
              }`}
              onClick={() => playTick()}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-(--cobalt) text-(--paper) font-mono text-[14px] font-bold uppercase tracking-wider shadow-hard-sm hover:bg-(--cobalt)/90 transition-colors no-underline select-none shrink-0"
            >
              <span>Inspect Evidence</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Candidate List */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-(--rule) pb-3">
              <h3 className="font-display text-[26px] font-normal text-(--ink) m-0">
                {verifyResult.verdict === "match"
                  ? "Matched candidates"
                  : "Nearest candidates (no match)"}
              </h3>
              <span className="font-mono text-[12px] text-(--ink-soft)">
                {verifyResult.candidates.length} returned
              </span>
            </div>

            {verifyResult.candidates.length === 0 ? (
              <div className="p-8 text-center bg-(--paper-2) border border-(--rule) rounded-2xl font-mono text-[14px] text-(--ink-soft)">
                No candidate images met index distance criteria.
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {verifyResult.candidates.map((cand) => {
                  const thumbUrl = `/api/images/${cand.image_id}/file?size=thumb`;
                  return (
                    <div
                      key={cand.image_id}
                      className="bg-(--paper-2) border border-(--rule) rounded-[24px] p-6 shadow-sm flex flex-col gap-6"
                    >
                      {/* Top candidate header & thumbnail */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                        <div className="flex justify-center md:justify-start">
                          <FramedImage
                            src={thumbUrl}
                            alt={`Candidate ${cand.image_id}`}
                            className="max-h-36"
                            offset={10}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <InsetGroupedList
                            items={[
                              { label: "Rank", value: `#${cand.rank}` },
                              { label: "Image ID", value: cand.image_id },
                              { label: "Owner Name", value: cand.owner_name, mono: false },
                              {
                                label: "Registered At",
                                value: new Date(cand.registered_at).toLocaleString(),
                                mono: false,
                              },
                            ]}
                          />
                        </div>
                      </div>

                      {/* Separate Classical & Deep panels */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <HammingPanel
                          scores={cand.hamming}
                          thresholds={verifyResult.thresholds?.evidence ?? undefined}
                        />
                        <CosinePanel
                          scores={cand.cosine}
                          thresholds={verifyResult.thresholds?.evidence ?? undefined}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Marquee */}
      <Marquee />
    </div>
  );
};
