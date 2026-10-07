import React from "react";
import { motion, useReducedMotion } from "motion/react";

export interface StampProps {
  verdict: "match" | "no_match" | "escalated";
  className?: string;
  size?: number;
}

export const Stamp: React.FC<StampProps> = ({
  verdict,
  className = "",
  size = 110,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const config = {
    match: {
      text: "MATCH",
      color: "border-(--sage) text-(--sage)",
      bg: "bg-(--paper-2)",
    },
    no_match: {
      text: "NO MATCH",
      color: "border-(--vermilion) text-(--vermilion)",
      bg: "bg-(--paper-2)",
    },
    escalated: {
      text: "ESCALATED",
      color: "border-(--ochre) text-(--ochre)",
      bg: "bg-(--paper-2)",
    },
  }[verdict];

  const initial = shouldReduceMotion
    ? { scale: 1, rotate: 12, opacity: 1 }
    : { scale: 1.3, rotate: 20, opacity: 0 };

  const animate = { scale: 1, rotate: 12, opacity: 1 };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={`relative inline-flex items-center justify-center rounded-full border-4 border-dashed font-mono font-bold tracking-[0.14em] uppercase select-none shadow-hard-sm ${config.color} ${config.bg} ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={`Verdict Stamp: ${config.text}`}
    >
      <div className="absolute inset-1.5 rounded-full border-2 border-solid opacity-70 pointer-events-none" />
      <span className="text-[15px] text-center font-bold px-2 leading-tight">
        {config.text}
      </span>
    </motion.div>
  );
};
