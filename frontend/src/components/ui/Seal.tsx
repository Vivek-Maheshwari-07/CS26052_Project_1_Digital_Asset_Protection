import React from "react";

export const FingerprintIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2a10 10 0 0 0-10 10c0 3.5 1.5 6.5 4 8.5" />
    <path d="M12 6a6 6 0 0 0-6 6c0 2.5 1 4.5 2.5 6" />
    <path d="M12 10a2 2 0 0 0-2 2c0 1.5.5 2.8 1.5 3.8" />
    <path d="M12 14a2 2 0 0 1 2-2c1.2 0 2.2.8 2.5 2" />
    <path d="M16 10a6 6 0 0 1 2 4.5c0 2-1 4-2.5 5.5" />
    <path d="M20 12c0 3-1.2 5.8-3.2 7.8" />
  </svg>
);

export interface SealProps {
  className?: string;
  size?: number;
}

export const Seal: React.FC<SealProps> = ({ className = "", size = 140 }) => {
  return (
    <div
      className={`relative rounded-full select-none shadow-hard shrink-0 group ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Background circle */}
      <div className="absolute inset-0 rounded-full bg-(--cobalt) text-(--paper) overflow-hidden flex items-center justify-center">
        {/* Dashed inner ring */}
        <div className="absolute inset-2.5 rounded-full border border-dashed border-(--paper) opacity-60 pointer-events-none" />

        {/* Rotating Circular Text Path */}
        <svg
          viewBox="0 0 140 140"
          className="w-full h-full animate-seal-spin pointer-events-none"
        >
          <path
            id="seal-text-path"
            d="M 70, 70 m -50, 0 a 50,50 0 1,1 100,0 a 50,50 0 1,1 -100,0"
            fill="none"
          />
          <text className="font-mono text-[9.5px] font-bold tracking-[0.22em] fill-(--paper) uppercase">
            <textPath href="#seal-text-path" startOffset="0%">
              PROVNET · HASH VS DEEP · PROVNET ·
            </textPath>
          </text>
        </svg>

        {/* Center Glyph */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-(--paper) text-(--cobalt-text) flex items-center justify-center shadow-xs">
            <FingerprintIcon size={22} />
          </div>
        </div>
      </div>
    </div>
  );
};
