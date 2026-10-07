import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { playTick } from "../utils/sound";

export interface ImageDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  selectedFile,
  onFileSelect,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Please select a valid image (JPEG, PNG, or WebP).");
      return;
    }
    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 10 MB limit.");
      return;
    }
    playTick();
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTick();
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        id="image-upload-input"
        disabled={disabled}
      />

      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 select-none ${
          isDragOver
            ? "border-(--cobalt) bg-(--paper-2) scale-[1.01]"
            : "border-(--ink-soft)/40 bg-(--paper-2)/70 hover:bg-(--paper-2) hover:border-(--ink)"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {selectedFile ? (
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Preview image */}
            <div className="relative border-2 border-(--ink) bg-(--paper) shadow-hard-sm">
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Selected preview"
                className="max-h-56 max-w-full object-contain"
              />
              <button
                type="button"
                onClick={clearSelection}
                className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-(--vermilion) text-(--paper) flex items-center justify-center shadow-xs hover:scale-110 transition-transform"
                title="Remove image"
                aria-label="Remove selected image"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[14px] font-bold text-(--ink) truncate max-w-[280px]">
                {selectedFile.name}
              </span>
              <span className="font-mono text-[12px] text-(--ink-soft)">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type.replace("image/", "").toUpperCase()}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-(--paper) border border-(--rule) flex items-center justify-center text-(--cobalt) shadow-xs">
              <Upload size={22} strokeWidth={2} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-display text-[24px] font-normal text-(--ink)">
                Drop an image or <span className="text-(--cobalt) italic">browse</span> ↗
              </span>
              <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-(--ink-soft)">
                JPEG · PNG · WEBP · ≤ 10 MB
              </span>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mt-2 text-center font-mono text-[12px] font-bold text-(--vermilion)">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
