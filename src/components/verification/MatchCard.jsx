import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  GitCompare,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Layers,
  Fingerprint
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/Progress';

export const MatchCard = ({ match, rank = 1 }) => {
  const metrics = match.similarityMetrics || {};
  const combined = metrics.combinedWeightedConfidence || 0;

  const getTierVariant = (tier) => {
    if (tier?.toLowerCase().includes('high')) return 'cyan';
    if (tier?.toLowerCase().includes('moderate')) return 'warning';
    return 'neutral';
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-500/40 text-cyan-400 font-mono font-bold flex items-center justify-center text-xs">
            #{rank}
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">{match.title}</h3>
            <p className="text-xs text-slate-400">
              Registered by <span className="text-slate-200 font-medium">{match.ownerName || match.creator}</span> • ID: <span className="font-mono text-cyan-400">{match.assetId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getTierVariant(match.similarityTier)} size="sm" dot>
            {match.similarityTier || 'Moderate Similarity'}
          </Badge>
        </div>
      </div>

      {/* Visual Thumbnails Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Suspicious Query */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Query Suspicious Image</span>
            <span className="text-rose-400">Query Target</span>
          </div>
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black/80 border border-rose-500/30">
            <img
              src={match.suspiciousImageUrl}
              alt="Query Image"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Registered Original */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Registered Provenance Original</span>
            <span className="text-emerald-400">Sealed Original</span>
          </div>
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black/80 border border-emerald-500/30">
            <img
              src={match.originalImageUrl}
              alt="Original Image"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Forensic Similarity Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Perceptual Match (pHash/aHash)</span>
            <span className="font-mono font-bold text-white">{metrics.perceptualSimilarityScore || 0}%</span>
          </div>
          <ProgressBar value={metrics.perceptualSimilarityScore || 0} max={100} size="xs" color="cyan" />
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Hamming Dist: {metrics.hammingDistance || 0} / 64
          </span>
        </div>

        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Semantic Match (CLIP/DINOv2)</span>
            <span className="font-mono font-bold text-white">{metrics.semanticSimilarityScore || 0}%</span>
          </div>
          <ProgressBar value={metrics.semanticSimilarityScore || 0} max={100} size="xs" color="blue" />
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Cosine Sim: {metrics.dinov2CosineSimilarity || 0.9}
          </span>
        </div>

        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Combined Confidence</span>
            <span className="font-mono font-bold text-cyan-300">{combined}%</span>
          </div>
          <ProgressBar value={combined} max={100} size="xs" color="cyan" />
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Dual-Pipeline Fusion
          </span>
        </div>
      </div>

      {/* Manipulation Heuristic Alerts */}
      {match.manipulationFlags && match.manipulationFlags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {match.manipulationFlags.map((flag, idx) => (
            <span
              key={idx}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-800/80 text-amber-300 border border-amber-500/20 flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <span className="text-xs text-slate-500 font-mono">
          Certificate: {match.certificateId || 'VF-CERT-2026-0814'}
        </span>
        <Link to={`/evidence/${match.evidenceId || 'evi_vf_882190_01'}`}>
          <Button variant="primary" size="sm" icon={GitCompare}>
            Inspect Full Evidence
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default MatchCard;
