import React from "react";

export interface MetricNumberProps {
  value: string | number;
  label: string;
  unit?: string;
  sublabel?: string;
  className?: string;
  valueClassName?: string;
}

export const MetricNumber: React.FC<MetricNumberProps> = ({
  value,
  label,
  unit,
  sublabel,
  className = "",
  valueClassName = "",
}) => {
  return (
    <div className={`flex flex-col justify-between ${className}`}>
      <div className="font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-(--ink-soft) mb-1 truncate">
        {label}
      </div>
      <div className="flex items-baseline gap-1 my-0.5">
        <span
          className={`font-display text-[38px] md:text-[44px] leading-none font-normal tracking-tight text-(--ink) ${valueClassName}`}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[13px] font-bold text-(--ink-soft)">
            {unit}
          </span>
        )}
      </div>
      {sublabel && (
        <div className="font-mono text-[11px] text-(--ink-soft) truncate mt-0.5">
          {sublabel}
        </div>
      )}
    </div>
  );
};
