import React, { useEffect, useState } from "react";

export const BackgroundCircle: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(media.matches);

    const listener = () => setPrefersReduced(media.matches);
    media.addEventListener("change", listener);

    const onScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      media.removeEventListener("change", listener);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const translateY = prefersReduced ? 0 : scrollY * 0.15;

  return (
    <div
      className="fixed -top-[20vw] -left-[20vw] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full bg-(--ochre) opacity-20 pointer-events-none z-0 blur-[1px] will-change-transform"
      style={{
        transform: `translateY(${translateY}px)`,
      }}
      aria-hidden="true"
    />
  );
};
