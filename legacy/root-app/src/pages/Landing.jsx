import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Fingerprint,
  Cpu,
  Layers,
  Award,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Lock,
  GitCompare,
  Database,
  Eye,
  FileCheck2,
  Activity
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { mockAssets } from '../data/mockData';

export const Landing = () => {
  return (
    <div className="space-y-24 sm:space-y-32 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-8 sm:pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          <Badge variant="cyan" size="sm" dot>
            Dual-Pipeline Cryptographic & Neural Provenance
          </Badge>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            Prove Where Your <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
              Images Came From.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-2xl">
            AI-powered image provenance verification that survives compression, cropping, and neural manipulation.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 w-full sm:w-auto">
            <Link to="/register" className="w-full sm:w-auto">
              <Button variant="glow" size="lg" icon={ShieldCheck} className="w-full">
                Register Your Work
              </Button>
            </Link>
            <Link to="/verify" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" icon={Search} className="w-full">
                Verify an Image
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Interactive Forensic Conceptual Visualization */}
        <div className="mt-14 max-w-5xl mx-auto rounded-3xl p-4 sm:p-6 bg-slate-900/80 border border-slate-800/80 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-slate-300 font-bold">VeriFrame Provenance Analysis Engine</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-cyan-400">
              <span>pHash: 0x8f3c9e1a4b7d2f0e</span>
              <span>•</span>
              <span>DINOv2: 768-dim ViT</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-center">
            {/* Suspicious Target */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-rose-400 font-mono font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  Suspicious Query Image
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Cropped 14% • WebP Q60</span>
              </div>
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-black border-2 border-rose-500/40 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60"
                  alt="Suspicious Image"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-dashed border-rose-400/60 m-2 rounded-xl pointer-events-none" />
              </div>
            </div>

            {/* Forensic Indicator Center Column */}
            <div className="md:col-span-2 flex flex-col items-center justify-center gap-3 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-xl">
                <GitCompare className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Combined Match</span>
                <p className="text-2xl font-black font-mono text-cyan-400">94.2%</p>
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  High Similarity
                </span>
              </div>
            </div>

            {/* Registered Original */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Original Registered Work
                </span>
                <span className="text-[10px] text-slate-500 font-mono">VF-CERT-2026-0814</span>
              </div>
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/40 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"
                  alt="Original Image"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
                  Original 8K HDR
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-16">
          <Badge variant="primary" size="sm">
            Step-by-Step Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            How VeriFrame Protects Digital Creators
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            A resilient multi-stage process from cryptographic asset sealing to deep forensic verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400 font-mono font-bold text-lg">
              01
            </div>
            <h3 className="text-xl font-bold text-white">Register & Seal</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload your original artwork or photography. The backend extracts structural perceptual hashes (pHash, aHash, dHash, WHash) and deep vector embeddings (CLIP & DINOv2).
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-lg">
              02
            </div>
            <h3 className="text-xl font-bold text-white">Immutable Provenance</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              A cryptographic timestamp and verifiable provenance certificate are minted. The asset is indexed into a high-dimensional vector registry (pgvector) for collision searching.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg">
              03
            </div>
            <h3 className="text-xl font-bold text-white">Forensic Verification</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Investigators and creators submit suspicious or cropped images to generate full forensic evidence, Hamming distances, cosine similarities, and weighted confidence reports.
            </p>
          </div>
        </div>
      </section>

      {/* 3. DUAL-PIPELINE TECHNOLOGY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-8 sm:p-12 lg:p-16 bg-gradient-to-b from-slate-900/90 to-[#0c1220] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <Badge variant="cyan" size="sm">
                Dual-Pipeline Innovation
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Combining Perceptual Invariance with Deep Semantic Understanding
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Traditional watermarks are easily wiped by cropping or recompression. VeriFrame pairs high-frequency perceptual hashing with foundation vision models to identify derivatives regardless of edits.
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold">
                    <Fingerprint className="w-4 h-4" />
                    <span>Pipeline A: Perceptual Fingerprinting (pHash, aHash, dHash, WHash)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Resilient to downscaling, JPEG compression artifacts, minor color adjustments, and spatial cropping.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                    <Cpu className="w-4 h-4" />
                    <span>Pipeline B: Neural Semantic Embeddings (CLIP & DINOv2)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Captures high-level visual semantics, composition style, and contextual objects even under severe geometric warping or collage manipulation.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800 font-mono text-xs space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-slate-400">Algorithmic Fusion Metric</span>
                  <span className="text-emerald-400">FastAPI ML Pipeline</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] mb-1">
                      <span>Perceptual Frequency Match</span>
                      <span className="text-cyan-400 font-bold">96.8%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full w-[96.8%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] mb-1">
                      <span>DINOv2 ViT-L/14 Cosine Alignment</span>
                      <span className="text-indigo-400 font-bold">0.963</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-400 h-full w-[96.3%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] mb-1">
                      <span>CLIP Normalized Vector Proximity</span>
                      <span className="text-blue-400 font-bold">0.941</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full w-[94.1%]" />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 leading-snug">
                  <span className="text-slate-200 font-semibold">Note on Authenticity:</span> Confidence scores reflect mathematical similarity derived by dual-pipeline models and do not claim absolute legal determination without verifiable chain of custody.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PUBLIC GALLERY PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <Badge variant="primary" size="sm">
              Public Registry
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Recently Sealed Creator Works
            </h2>
          </div>
          <Link to="/gallery">
            <Button variant="outline" size="sm" icon={Sparkles}>
              Explore Full Gallery
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockAssets.slice(0, 3).map((asset) => (
            <div
              key={asset.id}
              className="rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800 flex flex-col group"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <img
                  src={asset.imageUrl}
                  alt={asset.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="success" size="xs">
                    Verified Original
                  </Badge>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-base truncate">{asset.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{asset.description}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <span>By {asset.creator}</span>
                  <Link to={`/assets/${asset.id}`} className="text-cyan-400 hover:text-cyan-300 font-medium">
                    Inspect Record →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-10 sm:p-16 bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-cyan-900/40 border border-cyan-500/30 text-center space-y-6 shadow-2xl relative">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Protect Your Original Images Today.
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Create an immutable provenance record for your artwork, photography, or digital designs in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link to="/register">
              <Button variant="glow" size="lg" icon={ShieldCheck}>
                Register Original Work
              </Button>
            </Link>
            <Link to="/gallery">
              <Button variant="outline" size="lg">
                Browse Public Gallery
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
