import React from "react";
import { Sticker } from "./Sticker";

export interface DecidedByBadgeProps {
  decidedBy: string;
  className?: string;
}

export const DecidedByBadge: React.FC<DecidedByBadgeProps> = ({
  decidedBy,
  className = "",
}) => {
  const norm = decidedBy.toLowerCase();

  let label = "DECIDED BY: " + decidedBy.toUpperCase();
  let variant: "cobalt" | "ink" | "ochre" | "sage" | "paper" = "cobalt";

  if (norm === "sha256") {
    label = "STAGE 1 · SHA-256";
    variant = "sage";
  } else if (norm === "hash" || norm === "phash" || norm === "dhash") {
    label = "STAGE 2 · HASH";
    variant = "cobalt";
  } else if (norm === "deep" || norm === "embedding") {
    label = "STAGE 3 · EMBEDDING";
    variant = "ochre";
  } else if (norm === "none") {
    label = "CASCADE · EXHAUSTED";
    variant = "paper";
  }

  return (
    <Sticker variant={variant} rotate={-1} className={className}>
      {label}
    </Sticker>
  );
};
