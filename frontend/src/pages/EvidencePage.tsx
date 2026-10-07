import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQueryImage } from "../context/useQueryImage";
import { verifyImageDeep } from "../api/client";
import type { Candidate, DeepVerifyResponse, CosineScores } from "../api/types";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { InsetGroupedList } from "../components/ui/InsetGroupedList";
import { StatusPill } from "../components/ui/StatusPill";
import { DecidedByBadge } from "../components/ui/DecidedByBadge";
import { HammingPanel } from "../components/ui/HammingPanel";
import { CosinePanel } from "../components/ui/CosinePanel";
import {
  AlertTriangle,
  FileText,
  RotateCcw,
  Sliders,
  Sparkles,
} from "lucide-react";

export const EvidencePage: React.FC = () => {
  const { verificationId } = useParams<{ verificationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { queryFile, verifyResponse } = useQueryImage();

  // Selected candidate ID from URL query params
  const candidateParam = searchParams.get("candidate");

  // Deep verification state
  const [deepLoading, setDeepLoading] = useState<boolean>(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  const [deepResponse, setDeepResponse] = useState<DeepVerifyResponse | null>(null);
  const deepFetchedRef = useRef<boolean>(false);

  // Comparison slider position (0 - 100%)
  const [sliderPos, setSliderPos] = useState<number>(50);

  // Validate session context
  const isSessionValid =
    queryFile &&
    verifyResponse &&
    (!verificationId || verifyResponse.verification_id === verificationId);

  // Candidates list
  const candidates: Candidate[] = useMemo(() => {
    return verifyResponse?.candidates || [];
  }, [verifyResponse]);

  // Selected candidate object (default rank 1)
  const selectedCandidate = useMemo(() => {
    if (!candidates.length) return null;
    if (candidateParam) {
      const match = candidates.find((c) => c.image_id === candidateParam);
      if (match) return match;
    }
    return candidates[0];
  }, [candidates, candidateParam]);

  // Update candidate param in URL if none specified
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

  useEffect(() => {
    return () => {
      if (queryImageUrl) URL.revokeObjectURL(queryImageUrl);
    };
  }, [queryImageUrl]);

  // If session expired / invalid, render Apple-style empty state
  if (!isSessionValid) {
    return (
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-20 animate-fadeIn">
        <Card className="max-w-md mx-auto text-center py-12 space-y-6">
          <div className="w-16 h-16 rounded-full bg-[var(--apple-warning-subtle)] text-[var(--apple-warning)] mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-title-2 font-bold text-[var(--apple-label)]">
              Evidence session expired
            </h2>
            <p className="text-subheadline text-[var(--apple-secondary-label)]">
              Verification sessions are memory-safe and require the original query image file to compute on-demand deep similarity evidence.
            </p>
          </div>
          <div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/verify")}
              icon={<RotateCcw className="w-4 h-4 stroke-[1.75]" />}
            >
              Re-run verification
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Active candidate cosine scores (from VerifyResponse or DeepResponse)
  const currentCosineScores: CosineScores = (() => {
    if (!selectedCandidate) return { dino: null, clip: null };

    if (deepResponse) {
      const deepMatch = deepResponse.candidates.find(
        (c) => c.image_id === selectedCandidate.image_id
      );
      if (deepMatch) {
        return deepMatch.cosine;
      }
    }
    return selectedCandidate.cosine;
  })();

  const isComputedOnDemand =
    Boolean(deepResponse) || (selectedCandidate?.cosine.dino === null && !deepLoading);

  const evidenceThresholds = verifyResponse?.thresholds?.evidence || {
    phash: 8,
    dhash: 8,
    ahash: 8,
    whash: 8,
    dino: 0.9,
    clip: 0.9,
  };

  const candidateImageUrl = selectedCandidate
    ? `/api/images/${encodeURIComponent(selectedCandidate.image_id)}/file?size=full`
    : "";

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-large-title text-[var(--apple-label)] tracking-tight">
            Evidence & Deep Inspection
          </h1>
          <p className="text-subheadline text-[var(--apple-secondary-label)] mt-1">
            Visual overlay, perceptual hashes, and on-demand deep representation comparisons.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <DecidedByBadge
            decidedBy={verifyResponse.decided_by}
            verdict={verifyResponse.verdict}
          />
          <StatusPill
            status={verifyResponse.verdict === "match" ? "success" : "neutral"}
            label={verifyResponse.verdict === "match" ? "Match" : "No match"}
            size="md"
          />
        </div>
      </div>

      {/* Candidate Switcher Segmented Control */}
      {candidates.length > 1 && (
        <div className="space-y-2">
          <label className="text-footnote font-semibold uppercase tracking-wider text-[var(--apple-secondary-label)]">
            Select Matched Candidate
          </label>
          <SegmentedControl
            options={candidates.map((c) => ({
              value: c.image_id,
              label: `Rank #${c.rank} (${c.owner_name || "Anonymous"})`,
            }))}
            value={selectedCandidate?.image_id || candidates[0].image_id}
            onChange={(val) => setSearchParams({ candidate: val })}
          />
        </div>
      )}

      {/* Hero Visual Comparison: Side-by-Side & Swipe Overlay */}
      <Card className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-title-3 font-semibold text-[var(--apple-label)]">
            Visual Alignment & Verification
          </h3>
          <span className="text-caption text-[var(--apple-secondary-label)]">
            Original Query vs. Registered Candidate
          </span>
        </div>

        {/* Side-by-Side Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Query Image Frame */}
          <div className="bg-[var(--apple-grouped-background)] p-4 rounded-[14px] border border-[var(--apple-separator)] flex flex-col items-center justify-center space-y-3">
            <div className="h-64 sm:h-80 w-full flex items-center justify-center overflow-hidden rounded-[10px] bg-[var(--apple-card)]">
              {queryImageUrl && (
                <img
                  src={queryImageUrl}
                  alt="Query upload"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
            <span className="text-footnote font-semibold text-[var(--apple-label)]">
              Query Image (Uploaded)
            </span>
          </div>

          {/* Registered Candidate Frame */}
          <div className="bg-[var(--apple-grouped-background)] p-4 rounded-[14px] border border-[var(--apple-separator)] flex flex-col items-center justify-center space-y-3">
            <div className="h-64 sm:h-80 w-full flex items-center justify-center overflow-hidden rounded-[10px] bg-[var(--apple-card)]">
              {candidateImageUrl && (
                <img
                  src={candidateImageUrl}
                  alt="Registered database asset"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
            <span className="text-footnote font-semibold text-[var(--apple-label)]">
              Registered Asset #{selectedCandidate?.rank}
            </span>
          </div>
        </div>

        {/* Interactive Comparison Swipe Slider */}
        <div className="space-y-2 pt-2 hairline-t">
          <div className="flex items-center justify-between text-caption text-[var(--apple-secondary-label)]">
            <span className="flex items-center gap-1 font-medium">
              <Sliders className="w-3.5 h-3.5 stroke-[1.75]" />
              Overlay Comparison Slider ({sliderPos}%)
            </span>
            <span>Slide left/right to reveal differences</span>
          </div>

          <div className="relative h-64 sm:h-80 w-full rounded-[14px] overflow-hidden bg-[var(--apple-grouped-background)] border border-[var(--apple-separator)] select-none">
            {/* Background Registered Candidate */}
            {candidateImageUrl && (
              <img
                src={candidateImageUrl}
                alt="Registered overlay background"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            )}

            {/* Clipped Query Image */}
            {queryImageUrl && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img
                  src={queryImageUrl}
                  alt="Query overlay foreground"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              </div>
            )}

            {/* Dividing Line & Grab Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--apple-accent)] shadow-md pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[var(--apple-card)] border-2 border-[var(--apple-accent)] shadow-lg flex items-center justify-center text-[var(--apple-accent)]">
                <Sliders className="w-3.5 h-3.5 stroke-[1.75]" />
              </div>
            </div>

            {/* Transparent Slider Input Control */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
              aria-label="Comparison slider"
            />
          </div>
        </div>
      </Card>

      {/* Similarity Metrics Comparison Panels */}
      {selectedCandidate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HammingPanel
            scores={selectedCandidate.hamming}
            thresholds={evidenceThresholds}
            title="Classical Hashes (Hamming /64)"
          />

          <CosinePanel
            scores={currentCosineScores}
            thresholds={evidenceThresholds}
            title="Deep Embeddings (Cosine)"
            loading={deepLoading}
            error={deepError}
            computedOnDemand={isComputedOnDemand}
          />
        </div>
      )}

      {/* Cascade Execution Status Timeline */}
      <Card className="space-y-4">
        <h3 className="text-footnote font-semibold uppercase tracking-wider text-[var(--apple-secondary-label)]">
          Cascade Execution Stages & Latency Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {verifyResponse.stages.map((st) => (
            <div
              key={st.stage}
              className="p-4 rounded-[12px] bg-[var(--apple-grouped-background)] border border-[var(--apple-separator)] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-subheadline font-semibold text-[var(--apple-label)] capitalize">
                  {st.stage} Stage
                </span>
                <span className="font-mono text-caption text-[var(--apple-secondary-label)] tabular-nums">
                  {st.latency_ms}ms
                </span>
              </div>
              <div className="text-footnote text-[var(--apple-secondary-label)] mt-1">
                {st.stage === "sha256" && (st.hit ? "Exact match hit" : "Miss")}
                {st.stage === "hash" &&
                  (st.confident ? "Confident threshold match" : "Escalated to embedding")}
                {st.stage === "embedding" && (st.passed ? "Cosine similarity pass" : "No match")}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Metadata Inset Grouped List */}
      {selectedCandidate && (
        <Card className="space-y-4">
          <InsetGroupedList
            header="Registered Candidate Metadata"
            items={[
              { label: "Owner Name", value: selectedCandidate.owner_name || "Anonymous (Unverified)" },
              { label: "Registration Timestamp", value: new Date(selectedCandidate.registered_at).toLocaleString() },
              { label: "Asset ID", value: selectedCandidate.image_id, isMono: true },
            ]}
          />

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                window.open(`/api/images/${encodeURIComponent(selectedCandidate.image_id)}/record`, "_blank")
              }
              icon={<FileText className="w-3.5 h-3.5 stroke-[1.75]" />}
            >
              View Registration Record JSON
            </Button>
            <span className="text-caption text-[var(--apple-secondary-label)] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 stroke-[1.75]" />
              Cryptographically verified fingerprint
            </span>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[var(--apple-grouped-background)] border border-[var(--apple-separator)] text-footnote text-[var(--apple-secondary-label)] text-center">
            A registration record confirms submission time and fingerprint, not proof of ownership or copyright.
          </div>
        </Card>
      )}
    </div>
  );
};
