import React, { useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, X, AlertCircle } from "lucide-react";
import { Button } from "./ui/Button";

interface ImageDropzoneProps {
  onFileSelected: (file: File | null) => void;
  selectedFile: File | null;
  maxUploadMb?: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_MAX_MB = 10;

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  onFileSelected,
  selectedFile,
  maxUploadMb = DEFAULT_MAX_MB,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndSetFile = (file: File | null) => {
    setError(null);
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onFileSelected(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Unsupported format. Please select a JPEG, PNG, or WebP image.");
      onFileSelected(null);
      return;
    }

    const maxBytes = maxUploadMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`Image exceeds maximum allowed size of ${maxUploadMb} MB.`);
      onFileSelected(null);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const newPreview = URL.createObjectURL(file);
    setPreviewUrl(newPreview);
    onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileInputRef.current) fileInputRef.current.value = "";
    validateAndSetFile(null);
  };

  return (
    <div className="w-full space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-[16px] p-6 text-center cursor-pointer transition-all duration-200 apple-focus ${
          isDragOver
            ? "border-[var(--apple-accent)] bg-[var(--apple-accent-subtle)]"
            : "border-[var(--apple-separator)] hover:border-[var(--apple-accent)] bg-[var(--apple-grouped-background)]"
        }`}
      >
        <input
          id="image-upload-input"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload image"
        />

        {selectedFile && previewUrl ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="relative group max-w-xs rounded-[12px] overflow-hidden border border-[var(--apple-separator)] bg-[var(--apple-card)] shadow-sm">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="max-h-48 object-contain w-full rounded-[12px]"
              />
              <button
                type="button"
                onClick={handleClear}
                aria-label="Remove image"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-[var(--apple-modal-bg)] text-[var(--apple-label)] shadow-md hover:opacity-80 transition cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>
            <div className="text-footnote text-[var(--apple-label)] font-medium">
              {selectedFile.name}
              <span className="text-[var(--apple-secondary-label)] ml-2">
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
            <span className="text-caption text-[var(--apple-accent)] font-medium">
              Click or drag to replace image
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="w-12 h-12 rounded-full bg-[var(--apple-accent-subtle)] text-[var(--apple-accent)] flex items-center justify-center">
              {isDragOver ? (
                <UploadCloud className="w-6 h-6 stroke-[1.75]" />
              ) : (
                <ImageIcon className="w-6 h-6 stroke-[1.75]" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-headline font-semibold text-[var(--apple-label)]">
                Drag and drop your image here
              </p>
              <p className="text-footnote text-[var(--apple-secondary-label)]">
                Supports JPEG, PNG, or WebP (max {maxUploadMb} MB)
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Select Image File
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-[var(--apple-danger-subtle)] border border-[var(--apple-danger)]/20 rounded-[12px] text-footnote text-[var(--apple-danger)]">
          <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.75]" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
