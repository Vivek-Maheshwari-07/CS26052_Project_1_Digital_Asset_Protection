import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  icon: Icon
}) => {
  const variants = {
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    primary: 'bg-blue-950/60 text-blue-300 border-blue-500/40',
    cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    danger: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
    purple: 'bg-purple-950/60 text-purple-300 border-purple-500/40'
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    primary: 'bg-blue-400',
    cyan: 'bg-cyan-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    purple: 'bg-purple-400'
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 gap-1 font-medium',
    sm: 'text-xs px-2.5 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-3 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm backdrop-blur-sm select-none ${
        variants[variant] || variants.neutral
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            dotColors[variant] || dotColors.neutral
          } animate-pulse shrink-0`}
        />
      )}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
