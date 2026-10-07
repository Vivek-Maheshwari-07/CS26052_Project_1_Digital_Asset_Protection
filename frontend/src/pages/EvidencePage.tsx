import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQueryImage } from "../context/QueryImageContext";
import { verifyImageDeep } from "../api/client";
import type { DeepVerifyResponse, Candidate } from "../api/types";
import { Kicker } from "../components/ui/Kicker";
import { Sticker } from "../components/ui/Sticker";
import { Stamp } from "../components/ui/Stamp";
import { BackgroundCircle } from "../components/ui/BackgroundCircle";
import { TicketStub } from "../components/ui/TicketStub";
import { FramedImage } from "../components/ui/FramedImage";
import { HammingPanel } from "../components/ui/HammingPanel";
import { CosinePanel } from "../components/ui/CosinePanel";
import { InsetGroupedList } from "../components/ui/InsetGroupedList";
import { PillButton } from "../components/ui/PillButton";
import { Marquee } from "../components/ui/Marquee";
import { RecordModal } from "../components/RecordModal";
import { ArrowLeft, Split, FileText } from "lucide-react";
import { playTick } from "../utils/sound";

export const EvidencePage: React.FC = () => {
  const { verificationId } = useParams<{ verificationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const candidateParam = searchParams.get("candidate");

  const { queryFile, verifyResponse } = useQueryImage();

  const [deepResponse, setDeepResponse] = useState<DeepVerifyResponse | null>(null);
  const [deepLoading, setDeepLoading] = useState<boolean>(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  const deepFetchedRef = useRef(false);

  // Swipe slider position (0 to 100 percentage)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isSliderActive, setIsSliderActive] = useState<boolean>(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);

  // Check session validity
  const isSessionValid =
    queryFile !== null &&
    verifyResponse !== null &&
    verificationId === verifyResponse.verification_id;

  const candidates = useMemo<Candidate[]>(
    () => verifyResponse?.candidates ?? [],
    [verifyResponse?.candidates]
  );

  // Selected candidate based on query param or default to candidate rank 1
  const selectedCandidate = useMemo(() => {
    if (!candidates || candidates.length === 0) return null;
    if (!candidateParam) return candidates[0];
    const found = candidates.find((c) => c.image_id === candidateParam);
    return found || candidates[0];
  }, [candidates, candidateParam]);

  // Sync search params if candidate is missing
  useEffect(() => {
    if (isSessionValid && candidates.length > 0 && !candidateParam) {
      setSearchParams({ candidate: candidates[0].image_id }, { replace: true });
    }
  }, [isSessionValid, candidates, candidateParam, setSearchParams]);

  // On-demand Deep verification for null cosines
  useEffect(() => {
    if (!isSessionValid || !queryFile || !verifyResponse) return;
    if (deepFetchedRef.current) return;

    // Check if any candidate has null cosines
    const hasNullCosines = verifyResponse.candidates.some(
      (c) => c.cosine.dino === null || c.cosine.clip === null
    );

    if (hasNullCosines) {
      deepFetchedRef.current = true;
      Promise.resolve().then(() => {
        setDeepLoading(true);
        setDeepError(null);
      });

      verifyImageDeep(queryFile, verifyResponse.verification_id)
        .then((res) => {
          setDeepResponse(res);
        })
        .catch((err: unknown) => {
          setDeepError(
            err instanceof Error
              ? err.message
              : "Failed to compute deep embeddings on demand."
          );
        })
        .finally(() => {
          setDeepLoading(false);
        });
    }
  }, [isSessionValid, queryFile, verifyResponse]);

  // Query image object URL
  const queryImageUrl = useMemo(() => {
    if (!queryFile) return null;
    return URL.createObjectURL(queryFile);
  }, [queryFile]);

  // Selected candidate image URL
  const candidateFullImageUrl = useMemo(() => {
    if (!selectedCandidate) return null;
    return `/api/images/${selectedCandidate.image_id}/file?size=full`;
  }, [selectedCandidate]);

  // Merged cosine scores for the selected candidate
  const effectiveCosineScores = useMemo(() => {
    if (!selectedCandidate) return { dino: null, clip: null };
    if (deepResponse) {
      const deepCand = deepResponse.candidates.find(
        (c) => c.image_id === selectedCandidate.image_id
      );
      if (deepCand) {
        return deepCand.cosine;
      }
    }
    return selectedCandidate.cosine;
  }, [selectedCandidate, deepResponse]);

  // Handle swipe comparison slider
  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const offset = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (offset / rect.width) * 100));
    setSliderPos(pct);
  };

  // If session expired / invalid reload
  if (!isSessionValid) {
    return (
      <div className="relative min-w-0 max-w-[1080px] mx-auto px-4 pt-28 pb-16 flex flex-col items-center justify-center min-h-[70vh] text-center gap-6 z-10">
        <BackgroundCircle />
        <Kicker>SESSION EXPIRED</Kicker>
        <h1 className="font-display text-[48px] md:text-[64px] font-normal text-(--ink) m-0">
          Evidence session <span className="italic text-(--cobalt)">expired</span>.
        </h1>
        <p className="text-[17px] text-(--ink-soft) max-w-[40ch] m-0">
          Evidence inspection requires query image context in memory. Please re-run
          verification to inspect distance matrices and visual overlaps.
        </p>
        <Link to="/verify" onClick={() => playTick()}>
          <PillButton>Re-run verification</PillButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-w-0 max-w-[1080px] mx-auto px-4 pt-24 pb-16 flex flex-col gap-10 z-10">
      <BackgroundCircle />

      {/* Top Breadcrumb & Kicker */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          to="/verify"
          onClick={() => playTick()}
          className="inline-flex items-center gap-1.5 font-mono text-[13px] font-bold uppercase text-(--ink-soft) hover:text-(--ink) transition-colors no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Verify</span>
        </Link>

        <div className="flex items-center gap-3">
          <Kicker>● EVIDENCE INSPECTION SUITE</Kicker>
          <Sticker variant="cobalt" rotate={-1}>
            ID: {verifyResponse.verification_id.slice(0, 8)}...
          </Sticker>
        </div>
      </div>

      {/* Hero Title */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[clamp(40px,7vw,84px)] leading-[0.95] tracking-[-0.02em] text-(--ink) m-0 font-normal">
          The <span className="italic text-(--cobalt)">evidence</span>.
        </h1>
        <p className="text-[17px] text-(--ink-soft) max-w-[44ch] m-0">
          Multi-spectral inspection: side-by-side comparison, interactive swipe
          overlay, classical Hamming distances, and deep cosine embeddings.
        </p>
      </div>

      {/* Cascade Timeline Stubs */}
      {(() => {
        const stagesArray = Array.isArray(verifyResponse.stages) ? verifyResponse.stages : [];
        const stagesObj = !Array.isArray(verifyResponse.stages)
          ? (verifyResponse.stages as Record<string, any>)
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
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--ink-soft)">
              CASCADE VERDICT TIMELINE
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TicketStub
                number="01"
                name="SHA-256 Digest"
                status={isShaMatch ? "match" : "no_match"}
                latencyMs={shaStage?.latency_ms}
                detail={isShaMatch ? "Exact SHA-256 copy" : "No exact match"}
              />
              <TicketStub
                number="02"
                name="Perceptual Hashes"
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
              />
              <TicketStub
                number="03"
                name="Deep Embeddings"
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
                    : "DINOv2 + CLIP"
                }
              />
            </div>
          </div>
        );
      })()}

      {/* Candidate Switcher Stickers */}
      {candidates.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--ink-soft)">
            SELECT CANDIDATE ({candidates.length} FOUND)
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {candidates.map((cand) => {
              const isSelected = selectedCandidate?.image_id === cand.image_id;
              return (
                <button
                  key={cand.image_id}
                  type="button"
                  onClick={() => {
                    playTick();
                    setSearchParams({ candidate: cand.image_id });
                  }}
                  className={`px-4 py-2 rounded-full font-mono text-[12px] font-bold uppercase tracking-wider transition-all select-none ${
                    isSelected
                      ? "bg-(--ink) text-(--paper) shadow-hard-sm scale-105"
                      : "bg-(--paper-2) text-(--ink-soft) border border-(--rule) hover:text-(--ink)"
                  }`}
                >
                  Candidate #{cand.rank} ({cand.image_id.slice(0, 8)}...)
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Comparison: Side-by-Side & Swipe Overlay */}
      {selectedCandidate && queryImageUrl && candidateFullImageUrl && (
        <section className="flex flex-col gap-6 bg-(--paper-2) border-2 border-(--ink) rounded-[24px] p-6 md:p-8 shadow-hard">
          <div className="flex items-center justify-between border-b border-(--rule) pb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Stamp
                verdict={
                  verifyResponse.verdict === "match"
                    ? "match"
                    : "no_match"
                }
                size={80}
              />
              <div>
                <span className="font-mono text-[11px] font-bold uppercase text-(--cobalt)">
                  VISUAL INSPECTION
                </span>
                <h3 className="font-display text-[24px] text-(--ink) m-0">
                  Query vs. Candidate #{selectedCandidate.rank}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playTick();
                setIsSliderActive(!isSliderActive);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-(--paper) border border-(--rule) font-mono text-[12px] font-bold uppercase text-(--ink) hover:bg-(--ink) hover:text-(--paper) transition-colors"
            >
              <Split size={15} />
              <span>{isSliderActive ? "Side-by-side view" : "Swipe overlay view"}</span>
            </button>
          </div>

          {!isSliderActive ? (
            /* Side by Side FramedImages */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
              <div className="flex flex-col items-center gap-3">
                <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-(--ink-soft)">
                  QUERY IMAGE (UNREGISTERED)
                </span>
                <FramedImage
                  src={queryImageUrl}
                  alt="Query Image"
                  className="max-h-72"
                  offset={12}
                />
              </div>

              <div className="flex flex-col items-center gap-3">
                <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-(--ink-soft)">
                  REGISTERED CANDIDATE #{selectedCandidate.rank}
                </span>
                <FramedImage
                  src={candidateFullImageUrl}
                  alt={`Candidate ${selectedCandidate.image_id}`}
                  className="max-h-72"
                  offset={12}
                />
              </div>
            </div>
          ) : (
            /* Interactive Swipe Slider Overlay */
            <div className="flex flex-col items-center gap-3 py-4">
              <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-(--ink-soft)">
                DRAG SLIDER TO REVEAL OVERLAY (QUERY ↔ REGISTERED)
              </span>

              <div
                className="relative w-full max-w-2xl h-80 sm:h-96 border-2 border-(--ink) bg-(--paper) overflow-hidden cursor-ew-resize select-none shadow-hard-sm"
                onMouseMove={handleSliderMove}
                onTouchMove={handleSliderMove}
              >
                {/* Registered Candidate (Background) */}
                <img
                  src={candidateFullImageUrl}
                  alt="Candidate Background"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                {/* Query Image (Clipped Foreground) */}
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={queryImageUrl}
                    alt="Query Overlay"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none max-w-none"
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>

                {/* Slider Divider Line */}
                <div
                  className="absolute inset-y-0 w-1 bg-(--ink) shadow-md pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-(--ink) text-(--paper) flex items-center justify-center shadow-md">
                    <Split size={14} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Two Separate Metric Panels Side by Side */}
      {selectedCandidate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HammingPanel
            scores={selectedCandidate.hamming}
            thresholds={verifyResponse.thresholds?.evidence ?? undefined}
          />
          <CosinePanel
            scores={effectiveCosineScores}
            thresholds={verifyResponse.thresholds?.evidence ?? undefined}
            isLoading={deepLoading}
            error={deepError}
            isOnDemand={
              selectedCandidate.cosine.dino === null ||
              selectedCandidate.cosine.clip === null
            }
          />
        </div>
      )}

      {/* Candidate Metadata & Provenance Inset List */}
      {selectedCandidate && (
        <section className="flex flex-col gap-4 bg-(--paper-2) border border-(--rule) rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-(--rule) pb-3">
            <h3 className="font-display text-[22px] text-(--ink) m-0">
              Registration Metadata
            </h3>
            <button
              type="button"
              onClick={() => {
                playTick();
                setRecordModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase text-(--cobalt) hover:underline"
            >
              <FileText size={14} />
              <span>Inspect Full Record Sheet</span>
            </button>
          </div>

          <InsetGroupedList
            items={[
              { label: "Candidate Rank", value: `#${selectedCandidate.rank}` },
              { label: "Image ID", value: selectedCandidate.image_id },
              {
                label: "Owner Name",
                value: selectedCandidate.owner_name,
                mono: false,
              },
              {
                label: "Registered At",
                value: new Date(selectedCandidate.registered_at).toLocaleString(),
                mono: false,
              },
              {
                label: "Decided By Stage",
                value: verifyResponse.decided_by.toUpperCase(),
              },
              {
                label: "Cascade Latency",
                value: `${verifyResponse.latency_ms.toFixed(1)} ms`,
              },
            ]}
          />

          <div className="p-3 bg-(--paper) border border-(--rule) rounded-xl font-mono text-[11px] text-(--ink-soft)">
            Footnote: A registration record establishes an immutable timestamp and
            fingerprints in the index; it is not proof of copyright or legal ownership.
          </div>
        </section>
      )}

      {/* Marquee */}
      <Marquee />

      {/* Record Inspection Modal */}
      <RecordModal
        isOpen={recordModalOpen}
        imageId={selectedCandidate?.image_id || null}
        onClose={() => setRecordModalOpen(false)}
      />
    </div>
  );
};
