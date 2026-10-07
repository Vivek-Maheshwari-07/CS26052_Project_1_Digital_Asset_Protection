import React from "react";
import { Hash, Key, Cpu, HelpCircle } from "lucide-react";

export interface DecidedByBadgeProps {
  decidedBy: "sha256" | "hash" | "embedding" | "none" | string;
  verdict?: "match" | "no_match";
  className?: string;
}

export const DecidedByBadge: React.FC<DecidedByBadgeProps> = ({
  decidedBy,
  className = "",
}) => {
  let label = "Decided by: No match";
  let IconComponent = HelpCircle;
  let bgStyles = "bg-[var(--apple-neutral-subtle)] text-[var(--apple-neutral)]";

  switch (decidedBy) {
    case "sha256":
      label = "Decided by: SHA-256";
      IconComponent = Key;
      bgStyles = "bg-[var(--apple-accent-subtle)] text-[var(--apple-accent)]";
      break;
    case "hash":
      label = "Decided by: Hash";
      IconComponent = Hash;
      bgStyles = "bg-[var(--apple-accent-subtle)] text-[var(--apple-accent)]";
      break;
    case "embedding":
      label = "Decided by: Embedding";
      IconComponent = Cpu;
      bgStyles = "bg-[var(--apple-accent-subtle)] text-[var(--apple-accent)]";
      break;
    case "none":
    default:
      label = "Decided by: No match";
      IconComponent = HelpCircle;
      bgStyles = "bg-[var(--apple-neutral-subtle)] text-[var(--apple-neutral)]";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-footnote font-medium border border-[var(--apple-separator)] ${bgStyles} ${className}`}
    >
      <IconComponent className="w-4 h-4 stroke-[1.75]" />
      <span>{label}</span>
    </span>
  );
};
