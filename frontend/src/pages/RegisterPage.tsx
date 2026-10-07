import React, { useState } from "react";
import { formatErrorMessage, registerImage } from "../api/client";
import type { ConflictResponse, RegisterResponse } from "../api/types";
import { ConflictModal } from "../components/ConflictModal";
import { ImageDropzone } from "../components/ImageDropzone";
import { RecordModal } from "../components/RecordModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { InsetGroupedList } from "../components/ui/InsetGroupedList";
import { StatusPill } from "../components/ui/StatusPill";
import { Copy, Download, FileText, Check, AlertCircle, Sparkles } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ownerName, setOwnerName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [registerResult, setRegisterResult] = useState<RegisterResponse | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictResponse | null>(null);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const [shaCopied, setShaCopied] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setErrorMsg(null);
    setRegisterResult(null);
    setConflictResult(null);

    try {
      const res = await registerImage(selectedFile, ownerName);
      setRegisterResult(res);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 409) {
        const conflictData = (err as { conflictData?: ConflictResponse }).conflictData;
        if (conflictData) {
          setConflictResult(conflictData);
          setIsConflictModalOpen(true);
        } else {
          setErrorMsg(formatErrorMessage(err));
        }
      } else {
        setErrorMsg(formatErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const copySha256 = () => {
    if (!registerResult) return;
    navigator.clipboard.writeText(registerResult.sha256);
    setShaCopied(true);
    setTimeout(() => setShaCopied(false), 2000);
  };

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-large-title text-[var(--apple-label)] tracking-tight">
          Register Digital Asset
        </h1>
        <p className="text-subheadline text-[var(--apple-secondary-label)] mt-1">
          Compute cryptographic SHA-256 and perceptual fingerprints for immutable registration records.
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

      {/* Main Registration Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-headline text-[var(--apple-label)] block">
              Asset Image File
            </label>
            <ImageDropzone
              selectedFile={selectedFile}
              onFileSelected={setSelectedFile}
              maxUploadMb={10}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="owner-name-input"
              className="text-headline text-[var(--apple-label)] block"
            >
              Owner Name <span className="text-footnote text-[var(--apple-secondary-label)] font-normal">(Optional)</span>
            </label>
            <input
              id="owner-name-input"
              type="text"
              maxLength={100}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Satoshi Nakamoto / Studio ProvNet"
              className="w-full h-11 px-4 rounded-[12px] bg-[var(--apple-grouped-background)] text-[var(--apple-label)] border border-[var(--apple-separator)] apple-focus text-body placeholder:text-[var(--apple-secondary-label)]"
            />
            <p className="text-caption text-[var(--apple-secondary-label)]">
              Maximum 100 characters. Owner names are unverified and self-declared.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!selectedFile || loading}
              loading={loading}
              icon={<Sparkles className="w-4 h-4 stroke-[1.75]" />}
            >
              Submit for Registration
            </Button>
          </div>
        </form>
      </Card>

      {/* Success Registration Result Card */}
      {registerResult && (
        <Card className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-title-2 font-bold text-[var(--apple-label)]">
                  Asset Successfully Registered
                </h2>
                {registerResult.low_detail && (
                  <StatusPill status="warning" label="Low Detail Asset" size="sm" />
                )}
              </div>
              <p className="text-footnote text-[var(--apple-secondary-label)] mt-1">
                Registered on {new Date(registerResult.registered_at).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsRecordModalOpen(true)}
                icon={<FileText className="w-3.5 h-3.5 stroke-[1.75]" />}
              >
                View record
              </Button>
              <a
                href={`/api/images/${encodeURIComponent(registerResult.image_id)}/record?download=true`}
                target="_blank"
                rel="noreferrer"
                role="link"
                className="inline-flex items-center justify-center font-medium transition-all select-none btn-press apple-focus min-h-[36px] px-3 py-1.5 rounded-[10px] text-subheadline bg-[var(--apple-accent)] text-white hover:brightness-105 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-2 stroke-[1.75]" />
                <span>Download record</span>
              </a>
            </div>
          </div>

          {/* Cryptographic Identifiers */}
          <div className="space-y-4">
            <h3 className="text-footnote font-semibold uppercase tracking-wider text-[var(--apple-secondary-label)]">
              Cryptographic & Perceptual Identifiers
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SHA-256 Box */}
              <div className="p-4 rounded-[12px] bg-[var(--apple-grouped-background)] border border-[var(--apple-separator)] flex items-center justify-between">
                <div>
                  <span className="text-caption text-[var(--apple-secondary-label)] block">
                    SHA-256 Checksum
                  </span>
                  <span className="font-mono text-footnote font-semibold text-[var(--apple-label)] select-all tabular-nums">
                    {registerResult.sha256.slice(0, 16)}...{registerResult.sha256.slice(-8)}
                  </span>
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={copySha256}
                  icon={shaCopied ? <Check className="w-3.5 h-3.5 stroke-[1.75]" /> : <Copy className="w-3.5 h-3.5 stroke-[1.75]" />}
                >
                  {shaCopied ? "Copied" : "Copy"}
                </Button>
              </div>

              {/* Dimensions */}
              <div className="p-4 rounded-[12px] bg-[var(--apple-grouped-background)] border border-[var(--apple-separator)] flex items-center justify-between">
                <div>
                  <span className="text-caption text-[var(--apple-secondary-label)] block">
                    Asset Dimensions
                  </span>
                  <span className="font-mono text-footnote font-semibold text-[var(--apple-label)] tabular-nums">
                    {registerResult.width} × {registerResult.height} px
                  </span>
                </div>
                <StatusPill status="success" label="Ingested" size="sm" />
              </div>
            </div>

            {/* Inset Grouped Fingerprints List */}
            <InsetGroupedList
              header="Perceptual Hashes (16-char Hexadecimal)"
              items={[
                { label: "pHash (Discrete Cosine Transform)", value: registerResult.fingerprints.phash, isMono: true },
                { label: "dHash (Gradient Difference)", value: registerResult.fingerprints.dhash, isMono: true },
                { label: "aHash (Average Luminance)", value: registerResult.fingerprints.ahash, isMono: true },
                { label: "wHash (Haar Wavelet)", value: registerResult.fingerprints.whash, isMono: true },
              ]}
            />

            {/* Model Metadata List */}
            <InsetGroupedList
              header="Embedding Model Versions"
              items={[
                { label: "Config Version", value: registerResult.models.config_version, isMono: true },
                { label: "CLIP Vision Backbone", value: registerResult.models.clip, isMono: true },
                { label: "DINOv2 Feature Extractor", value: registerResult.models.dino, isMono: true },
              ]}
            />
          </div>

          {/* Mandatory Verbatim Disclaimer Notice */}
          <div className="p-4 rounded-[12px] bg-[var(--apple-grouped-background)] border border-[var(--apple-separator)] text-footnote text-[var(--apple-secondary-label)] text-center">
            "This is a Registration Record, not proof of ownership or copyright."
          </div>
        </Card>
      )}

      {/* Record Pretty-Print Modal */}
      {registerResult && (
        <RecordModal
          imageId={registerResult.image_id}
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
        />
      )}

      {/* 409 Conflict Modal */}
      <ConflictModal
        conflict={conflictResult}
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
      />
    </div>
  );
};
