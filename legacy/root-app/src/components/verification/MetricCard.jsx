import React from 'react';
import { HelpCircle } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

export const MetricCard = ({
  title,
  value,
  unit = '',
  description,
  tooltip,
  status = 'neutral',
  icon: Icon,
  className = ''
}) => {
  const statusColors = {
    neutral: 'border-slate-800 bg-slate-900/60 text-slate-100',
    high: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300',
    moderate: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
    low: 'border-slate-700 bg-slate-900/40 text-slate-400'
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${statusColors[status] || statusColors.neutral} ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-cyan-400 shrink-0" />}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            {title}
          </span>
        </div>
        {tooltip && (
          <Tooltip content={tooltip} position="top">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </Tooltip>
        )}
      </div>

      <div className="flex items-baseline gap-1 my-1">
        <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-slate-400">{unit}</span>}
      </div>

      {description && (
        <p className="text-xs text-slate-400 mt-1 leading-snug">{description}</p>
      )}
    </div>
  );
};

export default MetricCard;
