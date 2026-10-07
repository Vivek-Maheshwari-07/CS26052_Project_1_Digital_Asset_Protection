import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

export interface StatusPillProps {
  status?: "pass" | "escalated" | "fail" | "neutral";
  variant?: "success" | "warning" | "danger" | "neutral" | "info";
  label?: string;
  children?: React.ReactNode;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  variant,
  label,
  children,
  className = "",
}) => {
  // Normalize status
  const normalized =
    status ||
    (variant === "success"
      ? "pass"
      : variant === "warning"
      ? "escalated"
      : variant === "danger"
      ? "fail"
      : "neutral");

  const config = {
    pass: {
      icon: <CheckCircle2 size={13} strokeWidth={2.5} className="shrink-0" />,
      text: label || children || "Pass",
      classes: "bg-(--sage)/15 text-(--sage-text) border border-(--sage)/30",
    },
    escalated: {
      icon: <AlertTriangle size={13} strokeWidth={2.5} className="shrink-0" />,
      text: label || children || "Escalated",
      classes: "bg-(--ochre)/20 text-(--ink) border border-(--ochre)",
    },
    fail: {
      icon: <XCircle size={13} strokeWidth={2.5} className="shrink-0" />,
      text: label || children || "Fail",
      classes: "bg-(--vermilion)/15 text-(--vermilion-text) border border-(--vermilion)/30",
    },
    neutral: {
      icon: <Info size={13} strokeWidth={2.5} className="shrink-0" />,
      text: label || children || "Info",
      classes: "bg-(--paper) text-(--ink-soft) border border-(--rule)",
    },
  }[normalized];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold tracking-wider uppercase select-none ${config.classes} ${className}`}
    >
      {config.icon}
      <span>{config.text}</span>
    </span>
  );
};
