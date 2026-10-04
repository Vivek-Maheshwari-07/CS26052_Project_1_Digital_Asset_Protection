import React from 'react';
import { CircularProgress } from '../ui/Progress';
import Badge from '../ui/Badge';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

export const ConfidenceMeter = ({
  score = 0,
  tier = 'High Similarity',
  perceptualScore = 0,
  semanticScore = 0,
  size = 'lg'
}) => {
  const getBadgeVariant = () => {
    if (score >= 85) return 'cyan';
    if (score >= 60) return 'warning';
    return 'neutral';
  };

  const getProgressColor = () => {
    if (score >= 85) return '#06b6d4'; // cyan
    if (score >= 60) return '#f59e0b'; // amber
    return '#64748b'; // slate
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-2xl">
      <CircularProgress
        value={score}
        size={110}
        strokeWidth={9}
        color={getProgressColor()}
        trackColor="#1e293b"
      />

      <div className="flex-1 text-center sm:text-left space-y-2">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <Badge variant={getBadgeVariant()} size="sm" dot>
            {tier}
          </Badge>
          <span className="text-xs font-mono text-slate-400">
            Fused Confidence Score
          </span>
        </div>

        <h4 className="text-lg font-bold text-white">
          {score >= 85
            ? 'Strong Multi-Model Provenance Alignment'
            : score >= 60
            ? 'Moderate Proximity / Structural Divergence'
            : 'Low Semantic Match'}
        </h4>

        <p className="text-xs text-slate-400 leading-relaxed max-w-md">
          Calculated via dual-pipeline synthesis: Perceptual Hashes ({perceptualScore.toFixed(1)}%) + Deep Semantic Embeddings ({semanticScore.toFixed(1)}%).
        </p>
      </div>
    </div>
  );
};

export default ConfidenceMeter;
