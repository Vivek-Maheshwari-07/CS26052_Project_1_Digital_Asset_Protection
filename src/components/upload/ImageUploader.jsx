import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle, FileCheck, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';

export const ImageUploader = ({
  onImageSelected,
  selectedFile,
  previewUrl,
  onClear,
  accept = 'image/jpeg,image/png,image/webp,image/tiff',
  maxSizeMb = 25,
  title = 'Upload Image',
  description = 'Drag & drop high-resolution original image (PNG, JPEG, WEBP, TIFF up to 25MB)'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateAndProcessFile = (file) => {
    setError(null);
    if (!file) return;

    // Type check
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file format. Please upload JPEG, PNG, WEBP, or TIFF images.');
      return;
    }

    // Size check
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File size exceeds limit (${maxSizeMb} MB). Please choose a smaller image.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        onImageSelected({
          file,
          previewUrl: e.target.result,
          dimensions: `${img.naturalWidth} x ${img.naturalHeight}`,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          format: file.type.replace('image/', '').toUpperCase()
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />

      {!previewUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[260px] ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-950/20 shadow-xl shadow-cyan-500/10'
              : 'border-slate-700/80 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-cyan-400 mb-4 shadow-lg group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8 animate-bounce-slow" />
          </div>

          <h4 className="text-base sm:text-lg font-bold text-white mb-1.5">{title}</h4>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            {description}
          </p>

          <Button variant="secondary" size="sm" icon={ImageIcon}>
            Browse Files
          </Button>

          <div className="flex items-center gap-4 mt-6 text-[11px] text-slate-500 font-mono">
            <span>PNG • JPEG • WEBP • TIFF</span>
            <span>|</span>
            <span>Max {maxSizeMb}MB</span>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-2xl p-4 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative aspect-[4/3] w-full sm:w-64 max-h-56 rounded-xl overflow-hidden bg-black/80 flex items-center justify-center shrink-0 border border-slate-800">
            <img
              src={previewUrl}
              alt="Selected Preview"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0 space-y-3 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Image Loaded Successfully</span>
              </div>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedFile && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">File Name:</span>
                  <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                    {selectedFile.name || 'image.png'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Size & Dimensions:</span>
                  <span className="font-mono text-cyan-300">
                    {selectedFile.fileSize || '14 MB'} • {selectedFile.dimensions || '6000x4000'}
                  </span>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="xs"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              Replace Image
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-200 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
