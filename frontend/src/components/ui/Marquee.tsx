import React, { useEffect, useRef, useState } from "react";

const MARQUEE_ITEMS = [
  "PHASH",
  "DHASH",
  "AHASH",
  "WHASH",
  "CLIP VIT-B/32",
  "DINOV2-BASE",
  "PGVECTOR",
  "FASTAPI",
  "POSTGRESQL",
];

export const Marquee: React.FC<{ className?: string }> = ({ className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const content = (
    <div className="flex items-center gap-6 shrink-0 py-3.5">
      {MARQUEE_ITEMS.map((item, index) => (
        <React.Fragment key={index}>
          <span className="font-mono text-[13px] font-bold tracking-[0.14em] uppercase text-(--paper) whitespace-nowrap">
            {item}
          </span>
          <span className="text-(--ochre) text-[14px] select-none shrink-0" aria-hidden="true">
            ✳
          </span>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden my-12 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Rotated band container */}
      <div className="transform -rotate-[1.5deg] scale-[1.05]">
        {/* Main Ink Band */}
        <div className="bg-(--ink) border-y border-(--ink)/30 overflow-hidden flex">
          <div
            className="animate-marquee"
            style={{
              animationPlayState: isVisible ? "running" : "paused",
            }}
          >
            {content}
            {content}
            {content}
            {content}
          </div>
        </div>

        {/* Thin Peach Band underneath */}
        <div className="h-1.5 w-full bg-(--peach)" />
      </div>
    </div>
  );
};
