import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { hexTo64Bits } from "../../utils/bitGridHelper";

export interface BitGridProps {
  hashHex: string;
  name: string;
  className?: string;
}

export const BitGrid: React.FC<BitGridProps> = ({
  hashHex,
  name,
  className = "",
}) => {
  const bits = hexTo64Bits(hashHex);
  const shouldReduceMotion = useReducedMotion();

  // Group into 8 rows of 8 bits
  const rows: number[][] = [];
  for (let r = 0; r < 8; r++) {
    rows.push(bits.slice(r * 8, (r + 1) * 8));
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 p-3 bg-(--paper) border border-(--rule) rounded-lg ${className}`}
      data-testid={`bitgrid-${name.toLowerCase()}`}
    >
      <div className="flex items-center justify-between w-full font-mono text-[11px] font-bold uppercase text-(--ink-soft) tracking-wider">
        <span>{name}</span>
        <span className="font-mono text-[10px] truncate max-w-[80px]" title={hashHex}>
          {hashHex.slice(0, 8)}...
        </span>
      </div>

      {/* 8x8 Bit Matrix */}
      <div
        className="grid grid-rows-8 gap-0.5 p-1 bg-(--paper-2) border border-(--rule) rounded-xs shadow-inner"
        role="grid"
        aria-label={`${name} 8x8 bit grid`}
      >
        {rows.map((row, rowIndex) => (
          <motion.div
            key={rowIndex}
            initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: shouldReduceMotion ? 0 : rowIndex * 0.04,
              duration: 0.15,
            }}
            className="grid grid-cols-8 gap-0.5"
            role="row"
          >
            {row.map((bit, colIndex) => {
              const bitIndex = rowIndex * 8 + colIndex;
              return (
                <div
                  key={colIndex}
                  data-testid="bit-cell"
                  data-bit={bit}
                  data-index={bitIndex}
                  className={`w-2.5 h-2.5 rounded-[1px] transition-colors duration-150 ${
                    bit === 1
                      ? "bg-(--ink)"
                      : "bg-(--paper) border border-(--rule)"
                  }`}
                  title={`Bit ${bitIndex}: ${bit}`}
                  role="gridcell"
                />
              );
            })}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
