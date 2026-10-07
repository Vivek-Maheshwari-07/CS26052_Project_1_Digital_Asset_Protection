import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatErrorMessage, verifyImage } from "../api/client";
import type {
  Candidate,
  EmbeddingStage,
  HashStage,
  Sha256Stage,
  VerifyResponse,
} from "../api/types";
import { ImageDropzone } from "../components/ImageDropzone";
import { useQueryImage } from "../context/useQueryImage";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DecidedByBadge } from "../components/ui/DecidedByBadge";
import { StatusPill } from "../components/ui/StatusPill";
import { HammingPanel } from "../components/ui/HammingPanel";
import { CosinePanel } from "../components/ui/CosinePanel";
import { ShieldCheck, ShieldAlert, ArrowRight, User, Calendar, Clock, AlertCircle } from "lucide-react";

export const VerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const { setQueryData } = useQueryImage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setErrorMsg(null);
    setVerifyResult(null);

    try {
      const res = await verifyImage(selectedFile);
      setVerifyResult(res);
      setQueryData(selectedFile, res);
    } catch (err: unknown) {
      setErrorMsg(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const shaStage =
    verifyResult?.stages.find((s): s is Sha256Stage => s.stage === "sha256") || null;
  const hashStage =
    verifyResult?.stages.find((s): s is HashStage => s.stage === "hash") || null;
  const embStage =
    verifyResult?.stages.find((s): s is EmbeddingStage => s.stage === "embedding") || null;

  const evidenceThresholds = verifyResult?.thresholds?.evidence || {
    phash: 8,
    dhash: 8,
    ahash: 8,
    whash: 8,
    dino: 0.9,
    clip: 0.9,
  };

  const handleOpenEvidence = (candidateId: string) => {
    if (!verifyResult) return;
    navigate(`/evidence/${verifyResult.verification_id}?candidate=${encodeURIComponent(candidateId)}`);
  };

  const isMatch = verifyResult?.verdict === "match";

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-large-title text-[var(--apple-label)] tracking-tight">
          Verify Query Asset
        </h1>
        <p className="text-subheadline text-[var(--apple-secondary-label)] mt-1">
          Perform multi-stage cascade evaluation across exact SHA-256, perceptual hashes, and deep embeddings.
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 rounded-[14px] bg-[var(--apple-danger-subtle)] border border-[var(--apple-danger)]/20 flex items-center gap-3 text-body text-[var(--apple-danger)]"
        >
          <AlertCircle className="w-5 h-5 shrink-0 stroke-[1.75]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Query Asset Card */}
      <Card>
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-2">
            <label className="text-headline text-[var(--apple-label)] block">
              Query Image to Investigate
            </label>
            <ImageDropzone
              selectedFile={selectedFile}
              onFileSelected={setSelectedFile}
              maxUploadMb={10}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!selectedFile || loading}
              loading={loading}
              icon={<ShieldCheck className="w-4 h-4 stroke-[1.75]" />}
            >
              Run Verification
            </Button>
          </div>
        </form>
      </Card>

      {/* Progress & Cascade Pipeline Status */}
      {(loading || verifyResult) && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-footnote font-semibold uppercase tracking-wider text-[var(--apple-secondary-label)]">
              Cascade Execution Pipeline
            </h3>
            {verifyResult && (
              <span className="text-caption text-[var(--apple-secondary-label)] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 stroke-[1.75]" />
                Total Latency: {verifyResult.latency_ms} ms
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1: SHA-256 Exact */}
            <div
              className={`p-4 rounded-[12px] border transition-all ${
                shaStage?.hit
                  ? "border-[var(--apple-success)]/40 bg-[var(--apple-success-subtle)]"
                  : "border-[var(--apple-separator)] bg-[var(--apple-grouped-background)]"
              }`}
            >
              <div className="flex items-center justify-between text-subheadline font-semibold mb-1">
                <span className="text-[var(--apple-label)]">1. SHA-256 Exact</span>
                {shaStage ? (
                  <span className="font-mono text-caption text-[var(--apple-secondary-label)] tabular-nums">
                    {shaStage.latency_ms}ms
                  </span>
                ) : (
                  loading && <span className="w-2 h-2 rounded-full bg-[var(--apple-accent)] animate-ping" />
                )}
              </div>
              <div className="mt-1">
                {shaStage ? (
                  shaStage.hit ? (
                    <StatusPill status="success" label="Exact Match (Exit)" size="sm" />
                  ) : (
                    <StatusPill status="neutral" label="Miss (Proceed)" size="sm" />
                  )
                ) : (
                  <span className="text-caption text-[var(--apple-secondary-label)]">Evaluating...</span>
                )}
              </div>
            </div>

            {/* Step 2: Perceptual Hashes */}
            <div
              className={`p-4 rounded-[12px] border transition-all ${
                hashStage?.confident
                  ? "border-[var(--apple-success)]/40 bg-[var(--apple-success-subtle)]"
                  : hashStage
                  ? "border-[var(--apple-warning)]/40 bg-[var(--apple-warning-subtle)]"
                  : "border-[var(--apple-separator)] bg-[var(--apple-grouped-background)] opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-subheadline font-semibold mb-1">
                <span className="text-[var(--apple-label)]">2. Hash Check (SQL)</span>
                {hashStage ? (
                  <span className="font-mono text-caption text-[var(--apple-secondary-label)] tabular-nums">
                    {hashStage.latency_ms}ms
                  </span>
                ) : null}
              </div>
              <div className="mt-1">
                {hashStage ? (
                  hashStage.confident ? (
                    <StatusPill
                      status="success"
                      label={`Confident (d_H=${hashStage.best_phash_hamming ?? "—"})`}
                      size="sm"
                    />
                  ) : (
                    <StatusPill
                      status="warning"
                      label={`Escalated (d_H=${hashStage.best_phash_hamming ?? "—"})`}
                      size="sm"
                    />
                  )
                ) : (
                  <StatusPill
                    status="neutral"
                    label={shaStage?.hit ? "Skipped" : "Waiting..."}
                    size="sm"
                  />
                )}
              </div>
            </div>

            {/* Step 3: Deep Embedding */}
            <div
              className={`p-4 rounded-[12px] border transition-all ${
                embStage?.passed
                  ? "border-[var(--apple-success)]/40 bg-[var(--apple-success-subtle)]"
                  : embStage
                  ? "border-[var(--apple-separator)] bg-[var(--apple-grouped-background)]"
                  : "border-[var(--apple-separator)] bg-[var(--apple-grouped-background)] opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-subheadline font-semibold mb-1">
                <span className="text-[var(--apple-label)]">3. Embedding (DINO/CLIP)</span>
                {embStage ? (
                  <span className="font-mono text-caption text-[var(--apple-secondary-label)] tabular-nums">
                    {embStage.latency_ms}ms
                  </span>
                ) : null}
              </div>
              <div className="mt-1">
                {embStage ? (
                  embStage.passed ? (
                    <StatusPill
                      status="success"
                      label={`Match (cos=${embStage.best_dino_cosine?.toFixed(4) ?? "—"})`}
                      size="sm"
                    />
                  ) : (
                    <StatusPill
                      status="fail"
                      label={`No match (cos=${embStage.best_dino_cosine?.toFixed(4) ?? "—"})`}
                      size="sm"
                    />
                  )
                ) : (
                  <StatusPill
                    status="neutral"
                    label={verifyResult ? "Skipped (Hash Exit)" : "Waiting..."}
                    size="sm"
                  />
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Verification Verdict Banner */}
      {verifyResult && (
        <Card
          className={`space-y-4 border-2 ${
            isMatch
              ? "border-[var(--apple-success)]/30 bg-[var(--apple-card)]"
              : "border-[var(--apple-separator)] bg-[var(--apple-card)]"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${
                  isMatch
                    ? "bg-[var(--apple-success-subtle)] text-[var(--apple-success)]"
                    : "bg-[var(--apple-neutral-subtle)] text-[var(--apple-neutral)]"
                }`}
              >
                {isMatch ? (
                  <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
                ) : (
                  <ShieldAlert className="w-6 h-6 stroke-[1.75]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-title-1 font-bold tracking-tight text-[var(--apple-label)]">
                    {isMatch ? "Verdict: Match Found" : "Verdict: No Match Found"}
                  </h2>
                  <StatusPill
                    status={isMatch ? "success" : "neutral"}
                    label={isMatch ? "Verified Copy" : "Independent Asset"}
                  />
                </div>
                <p className="text-subheadline text-[var(--apple-secondary-label)] mt-0.5">
                  {isMatch
                    ? "Query image matched against the registered database."
                    : "No registered asset satisfied the similarity confidence criteria."}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end sm:self-center">
              <DecidedByBadge
                decidedBy={verifyResult.decided_by}
                verdict={verifyResult.verdict}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Candidates List Section (Fix 2.2 applied) */}
      {verifyResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title-2 font-bold text-[var(--apple-label)]">
              {isMatch ? "Matched candidates" : "Nearest candidates (no match)"}
            </h2>
            <span className="text-footnote text-[var(--apple-secondary-label)]">
              {verifyResult.candidates.length} candidate{verifyResult.candidates.length === 1 ? "" : "s"} evaluated
            </span>
          </div>

          {verifyResult.candidates.length === 0 ? (
            <Card className="text-center py-12 text-[var(--apple-secondary-label)]">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-40 stroke-[1.75]" />
              <p className="text-headline text-[var(--apple-label)]">No registered image matched</p>
              <p className="text-footnote mt-1">
                The asset has no perceptual hash collisions or deep embedding similarities in the database.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {verifyResult.candidates.map((candidate: Candidate) => (
                <Card key={candidate.image_id} className="space-y-4">
                  {/* Candidate Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={candidate.thumbnail_url}
                        alt={`Candidate rank #${candidate.rank}`}
                        className="w-16 h-16 object-cover rounded-[10px] border border-[var(--apple-separator)] bg-[var(--apple-grouped-background)] shadow-sm"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-[6px] bg-[var(--apple-grouped-background)] text-caption font-bold text-[var(--apple-label)] border border-[var(--apple-separator)]">
                            Rank #{candidate.rank}
                          </span>
                          <span className="font-mono text-footnote font-semibold text-[var(--apple-label)]">
                            {candidate.image_id}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote text-[var(--apple-secondary-label)]">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 stroke-[1.75]" />
                            {candidate.owner_name || "Anonymous"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 stroke-[1.75]" />
                            {new Date(candidate.registered_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEvidence(candidate.image_id)}
                        icon={<ArrowRight className="w-3.5 h-3.5 stroke-[1.75]" />}
                      >
                        Open evidence
                      </Button>
                    </div>
                  </div>

                  {/* Similarity Metrics Panels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <HammingPanel
                      scores={candidate.hamming}
                      thresholds={evidenceThresholds}
                      title="Classical Hashes (Hamming /64)"
                    />
                    <CosinePanel
                      scores={candidate.cosine}
                      thresholds={evidenceThresholds}
                      title="Deep Embeddings (Cosine)"
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
