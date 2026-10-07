import React from "react";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
  ariaLabel = "Segmented Options",
}: SegmentedControlProps<T>) {
  const heightStyles = size === "sm" ? "h-8 p-0.5 text-caption" : "h-10 p-1 text-subheadline";

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center bg-[var(--apple-grouped-background)] rounded-[12px] border border-[var(--apple-separator)] ${heightStyles} ${className} relative select-none`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`flex-1 inline-flex items-center justify-center px-3 h-full rounded-[9px] font-medium transition-all duration-200 cursor-pointer ${
              isSelected
                ? "bg-[var(--apple-card)] text-[var(--apple-label)] shadow-sm font-semibold"
                : "text-[var(--apple-secondary-label)] hover:text-[var(--apple-label)] bg-transparent"
            }`}
          >
            {opt.icon && <span className="mr-1.5 inline-flex">{opt.icon}</span>}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
