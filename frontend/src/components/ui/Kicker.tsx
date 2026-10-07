import React from "react";

interface KickerProps {
  children: React.ReactNode;
  className?: string;
}

export const Kicker: React.FC<KickerProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`inline-flex items-center gap-2 font-mono text-[12px] font-bold tracking-[0.12em] uppercase text-(--ink-soft) ${className}`}
    >
      <span
        className="w-2 h-2 rounded-full bg-(--vermilion) shrink-0"
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  );
};
