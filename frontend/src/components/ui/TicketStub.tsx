import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Sticker } from "./Sticker";

export interface TicketStubProps {
  number?: string;
  name: string;
  status: "match" | "no_match" | "miss" | "skipped" | "running" | "pending";
  latencyMs?: number | null;
  detail?: string;
  delayIndex?: number;
  className?: string;
}

export const TicketStub: React.FC<TicketStubProps> = ({
  number,
  name,
  status,
  latencyMs,
  detail,
  delayIndex = 0,
  className = "",
}) => {
  const shouldReduceMotion = useReducedMotion();

  const isSkipped = status === "skipped";
  const isMatch = status === "match";
  const isNoMatch = status === "no_match";
  const isMiss = status === "miss";

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: shouldReduceMotion ? 0 : delayIndex * 0.12,
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={`relative flex flex-col justify-between p-4 bg-(--paper-2) border border-(--rule) rounded-xl overflow-hidden shadow-sm min-w-[150px] flex-1 ${
        isSkipped ? "opacity-60 bg-(--paper-2)/50" : ""
      } ${className}`}
    >
      {/* Perforated Top Edge Indicator */}
      <div className="absolute top-0 left-3 right-3 h-[2px] border-t border-dashed border-(--ink-soft)/40" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 font-mono">
        {number ? (
          <>
            <span className="text-[12px] font-bold text-(--cobalt)">{number}</span>
            <span className="text-[12px] font-bold uppercase tracking-wider text-(--ink)">
              {name}
            </span>
          </>
        ) : (
          <span className="text-[12px] font-bold uppercase tracking-wider text-(--ink)">
            {name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center py-2">
        {isSkipped ? (
          <div className="py-2 flex justify-center">
            <Sticker variant="paper" rotate={-8} className="text-[10px]">
              SKIPPED
            </Sticker>
          </div>
        ) : isMatch ? (
          <div className="flex items-center gap-1.5 text-(--sage) font-mono text-[13px] font-bold">
            <CheckCircle2 size={16} strokeWidth={2} />
            <span>Match</span>
          </div>
        ) : isMiss ? (
          <div className="text-(--ink-soft) font-mono text-[12px] font-medium">
            → Miss · next stage
          </div>
        ) : isNoMatch ? (
          <div className="flex items-center gap-1.5 text-(--vermilion) font-mono text-[13px] font-bold">
            <XCircle size={16} strokeWidth={2} />
            <span>No match</span>
          </div>
        ) : status === "running" ? (
          <div className="flex items-center gap-1.5 text-(--cobalt) font-mono text-[13px] animate-pulse">
            <Clock size={16} />
            <span>Running...</span>
          </div>
        ) : (
          <div className="text-(--ink-soft) font-mono text-[12px]">Pending</div>
        )}

        {detail && !isSkipped && (
          <div className="text-[11px] font-mono text-(--ink-soft) mt-1 truncate">
            {detail}
          </div>
        )}
      </div>

      {/* Footer: Latency */}
      <div className="pt-2 border-t border-(--rule) flex items-center justify-between font-mono text-[11px] text-(--ink-soft)">
        <span>LATENCY</span>
        <span className="tabular-nums font-bold text-(--ink)">
          {latencyMs != null && !isSkipped ? `${latencyMs.toFixed(1)} ms` : "—"}
        </span>
      </div>
    </motion.div>
  );
};
