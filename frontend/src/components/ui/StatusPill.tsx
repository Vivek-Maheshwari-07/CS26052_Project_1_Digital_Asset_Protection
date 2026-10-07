import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, Minus } from "lucide-react";

export type StatusVariant = "success" | "warning" | "danger" | "neutral" | "accent";

export interface StatusPillProps {
  status: StatusVariant | "pass" | "fail" | "escalated" | "none" | "skipped";
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  className = "",
  size = "md",
}) => {
  let variant: StatusVariant = "neutral";
  let defaultLabel = "Neutral";
  let IconComponent = Info;

  switch (status) {
    case "success":
    case "pass":
      variant = "success";
      defaultLabel = "Pass";
      IconComponent = CheckCircle2;
      break;
    case "warning":
    case "escalated":
      variant = "warning";
      defaultLabel = "Escalated";
      IconComponent = AlertTriangle;
      break;
    case "danger":
    case "fail":
      variant = "danger";
      defaultLabel = "Fail";
      IconComponent = XCircle;
      break;
    case "accent":
      variant = "accent";
      defaultLabel = "Active";
      IconComponent = Info;
      break;
    case "skipped":
    case "none":
    case "neutral":
    default:
      variant = "neutral";
      defaultLabel = status === "skipped" ? "Skipped" : "—";
      IconComponent = Minus;
      break;
  }

  const textToDisplay = label ?? defaultLabel;

  let bgTextStyles = "bg-[var(--apple-neutral-subtle)] text-[var(--apple-neutral)]";
  if (variant === "success") {
    bgTextStyles = "bg-[var(--apple-success-subtle)] text-[var(--apple-success)]";
  } else if (variant === "warning") {
    bgTextStyles = "bg-[var(--apple-warning-subtle)] text-[var(--apple-warning)]";
  } else if (variant === "danger") {
    bgTextStyles = "bg-[var(--apple-danger-subtle)] text-[var(--apple-danger)]";
  } else if (variant === "accent") {
    bgTextStyles = "bg-[var(--apple-accent-subtle)] text-[var(--apple-accent)]";
  }

  const sizeStyles =
    size === "sm"
      ? "px-2 py-0.5 text-caption gap-1"
      : "px-2.5 py-1 text-footnote gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${bgTextStyles} ${sizeStyles} ${className}`}
    >
      <IconComponent className={size === "sm" ? "w-3.5 h-3.5 stroke-[1.75]" : "w-4 h-4 stroke-[1.75]"} />
      <span>{textToDisplay}</span>
    </span>
  );
};
