import React from "react";

export interface MetricNumberProps {
  value: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: React.ReactNode;
  variant?: "default" | "accent" | "success" | "warning" | "danger";
  className?: string;
}

export const MetricNumber: React.FC<MetricNumberProps> = ({
  value,
  label,
  sublabel,
  badge,
  variant = "default",
  className = "",
}) => {
  let valueColor = "text-[var(--apple-label)]";
  if (variant === "accent") valueColor = "text-[var(--apple-accent)]";
  else if (variant === "success") valueColor = "text-[var(--apple-success)]";
  else if (variant === "warning") valueColor = "text-[var(--apple-warning)]";
  else if (variant === "danger") valueColor = "text-[var(--apple-danger)]";

  return (
    <div
      className={`bg-[var(--apple-card)] rounded-[16px] border border-[var(--apple-separator)] p-5 shadow-[var(--apple-card-shadow)] flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-subheadline font-medium text-[var(--apple-secondary-label)]">
          {label}
        </span>
        {badge}
      </div>
      <div>
        <div className={`text-large-title font-bold tabular-nums tracking-tight ${valueColor}`}>
          {value}
        </div>
        {sublabel && (
          <div className="text-caption text-[var(--apple-secondary-label)] mt-1">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
};
