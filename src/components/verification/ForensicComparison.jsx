import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Sliders,
  Layers,
  Columns,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import Button from '../ui/Button';

export const ForensicComparison = ({
  originalImage,
  suspiciousImage,
  originalTitle = 'Original Registered Work',
  suspiciousTitle = 'Suspicious Query Image'
}) => {
  const [viewMode, setViewMode] = useState('split'); // 'split', 'side-by-side', 'diff'
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  return (
    <div className="rounded-2xl bg-[#0b0f19] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'split' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Interactive Split</span>
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'side-by-side' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'diff' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Heatmap Overlay</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-slate-400">
            <button
              onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.25))}
              disabled={zoomLevel <= 1}
              className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.25))}
              disabled={zoomLevel >= 2.5}
              className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 hover:text-white ml-1 text-cyan-400 cursor-pointer"
                title="Reset zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Forensic Comparison Display */}
      <div className="relative p-4 sm:p-6 bg-slate-950/90 min-h-[420px] flex items-center justify-center overflow-hidden">
        {viewMode === 'split' && (
          <div
            className="relative w-full max-w-3xl aspect-[16/10] select-none rounded-xl overflow-hidden border border-slate-800 cursor-ew-resize shadow-2xl"
            onMouseMove={(e) => {
              if (e.buttons === 1 || isDragging) handleSliderMove(e);
            }}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onClick={handleSliderMove}
          >
            {/* Suspicious Layer (Background) */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <img
                src={suspiciousImage}
                alt="Suspicious Target"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                className="w-full h-full object-cover transition-transform"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-500/40 text-[11px] font-bold text-rose-300 backdrop-blur-md flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Query Target (Suspicious)
              </div>
            </div>

            {/* Original Layer (Clipped Foreground) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <div className="w-[100vw] max-w-3xl h-full aspect-[16/10] overflow-hidden">
                <img
                  src={originalImage}
                  alt="Original Registered"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                  className="w-full h-full object-cover transition-transform"
                />
              </div>
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 backdrop-blur-md flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Sealed Original Work
              </div>
            </div>

            {/* Split Divider Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 shadow-xl">
                <Sliders className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-rose-400 flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Suspicious Query Derivative
                </span>
                <span className="text-slate-500 text-[10px]">Crop & Transcode detected</span>
              </div>
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black border border-rose-500/40 shadow-xl">
                <img
                  src={suspiciousImage}
                  alt="Suspicious"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                  className="w-full h-full object-cover transition-transform"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Original Registered Work
                </span>
                <span className="text-slate-500 text-[10px]">Cryptographically Sealed</span>
              </div>
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black border border-emerald-500/40 shadow-xl">
                <img
                  src={originalImage}
                  alt="Original"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                  className="w-full h-full object-cover transition-transform"
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'diff' && (
          <div className="relative w-full max-w-3xl aspect-[16/10] rounded-xl overflow-hidden border border-cyan-500/40 shadow-2xl bg-black">
            <img
              src={suspiciousImage}
              alt="Base Image"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
              className="w-full h-full object-cover opacity-60 mix-blend-screen"
            />
            {/* Simulated forensic difference heatmap filter */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-rose-500/25 to-amber-500/20 mix-blend-color-dodge pointer-events-none" />
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/80 border border-cyan-500/40 backdrop-blur-md text-xs font-mono text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Spectral Difference & Quantization Artifact Heatmap</span>
            </div>
            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/80 border border-slate-700 text-[10px] font-mono text-slate-300">
              Highlighted Regions: Spatial Boundary Crop (~14%)
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-900/60 border-t border-slate-800 text-center text-xs text-slate-400">
        Drag slider horizontally to visually cross-examine boundary alignment and color manipulation.
      </div>
    </div>
  );
};

export default ForensicComparison;
