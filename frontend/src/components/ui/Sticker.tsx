import React from "react";

export interface StickerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "cobalt" | "ink" | "ochre" | "vermilion" | "sage" | "paper";
  rotate?: number;
  className?: string;
  onClick?: () => void;
}

export const Sticker: React.FC<StickerProps> = ({
  children,
  variant = "cobalt",
  rotate = -2,
  className = "",
  onClick,
  ...rest
}) => {
  const variantStyles = {
    cobalt: "bg-(--cobalt) text-(--paper)",
    ink: "bg-(--ink) text-(--paper)",
    ochre: "bg-(--ochre) text-(--ink)",
    vermilion: "bg-(--vermilion) text-(--paper)",
    sage: "bg-(--sage) text-(--paper)",
    paper: "bg-(--paper-2) text-(--ink) border border-(--rule)",
  }[variant];

  return (
    <div
      style={{
        transform: `rotate(${rotate}deg)`,
      }}
      onClick={onClick}
      className={`inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-mono font-bold tracking-[0.12em] uppercase rounded-sm shadow-hard-sm transition-transform duration-150 ${
        onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""
      } ${variantStyles} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
