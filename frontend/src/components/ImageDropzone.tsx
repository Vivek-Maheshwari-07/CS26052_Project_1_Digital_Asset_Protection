import React, { useCallback, useState } from "react";

interface ImageDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onError: (msg: string | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  selectedFile,
  onFileSelect,
  onError,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const validateAndSelectFile = useCallback(
    (file: File) => {
      onError(null);

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        onError("Unsupported file format. Please upload a JPEG, PNG, or WebP image.");
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        onError("Image exceeds 10 MB limit. Please select a smaller image.");
        return;
      }

      onFileSelect(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    },
    [onError, onFileSelect],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onError(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center flex flex-col items-center justify-center min-h-[220px] ${
        disabled
          ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800"
          : isDragging
          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[0.99]"
          : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900/50"
      }`}
    >
      <input
        type="file"
        id="image-upload-input"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />

      {selectedFile && previewUrl ? (
        <div className="flex flex-col items-center space-y-3 z-10">
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Query preview"
              className="max-h-48 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 object-contain"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow-sm transition"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-2 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            JPEG, PNG, or WebP (max 10 MB)
          </p>
        </div>
      )}
    </div>
  );
};
