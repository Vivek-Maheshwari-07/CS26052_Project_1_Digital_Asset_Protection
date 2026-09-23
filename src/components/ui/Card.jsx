import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  glow = false,
  onClick,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border transition-all duration-300 ${
        glow
          ? 'glass-panel-glow'
          : hoverEffect
          ? 'glass-card'
          : 'bg-slate-900/60 backdrop-blur-md border-slate-800/80 shadow-lg shadow-black/20'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', title, subtitle, action }) => {
  if (title || subtitle || action) {
    return (
      <div className={`flex items-start justify-between p-5 sm:p-6 border-b border-slate-800/60 ${className}`}>
        <div>
          {title && <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>}
          {subtitle && <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0 ml-4">{action}</div>}
      </div>
    );
  }
  return <div className={`p-5 sm:p-6 border-b border-slate-800/60 ${className}`}>{children}</div>;
};

export const CardContent = ({ children, className = '' }) => {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
};

export const CardFooter = ({ children, className = '' }) => {
  return <div className={`p-5 sm:p-6 border-t border-slate-800/60 bg-slate-950/30 rounded-b-2xl ${className}`}>{children}</div>;
};

export default Card;
