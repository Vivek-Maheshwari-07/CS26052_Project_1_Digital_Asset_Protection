import React from 'react';

export const ProgressBar = ({
  value = 0,
  max = 100,
  size = 'md',
  color = 'blue',
  showLabel = false,
  label = '',
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const colorGradients = {
    blue: 'bg-gradient-to-r from-blue-600 to-cyan-500',
    cyan: 'bg-gradient-to-r from-cyan-500 to-teal-400',
    emerald: 'bg-gradient-to-r from-emerald-500 to-green-400',
    amber: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    rose: 'bg-gradient-to-r from-rose-600 to-pink-500',
    purple: 'bg-gradient-to-r from-indigo-600 to-purple-500'
  };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs text-slate-300 mb-1.5 font-medium">
          <span>{label}</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 ${sizeClasses[size] || sizeClasses.md}`}>
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${colorGradients[color] || colorGradients.blue}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const CircularProgress = ({
  value = 0,
  size = 80,
  strokeWidth = 6,
  color = '#06b6d4',
  trackColor = '#1e293b',
  showValue = true,
  unit = '%',
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">
            {value.toFixed(1)}
            <span className="text-[10px] text-slate-400 font-normal">{unit}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
