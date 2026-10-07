import React from "react";
import { playTick } from "../../utils/sound";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  badge?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[] | { value: string; label: string }[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center p-1 bg-(--paper-2) border border-(--rule) rounded-full shadow-inner ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => {
              playTick();
              onChange(opt.value as T);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-[12px] font-bold uppercase tracking-wider transition-all duration-150 select-none ${
              isSelected
                ? "bg-(--ink) text-(--paper) shadow-hard-sm"
                : "text-(--ink-soft) hover:text-(--ink)"
            }`}
          >
            <span>{opt.label}</span>
            {"badge" in opt && opt.badge && <span>{opt.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
