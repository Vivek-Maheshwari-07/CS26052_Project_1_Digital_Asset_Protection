import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = "md",
  elevated = false,
  className = "",
  ...props
}) => {
  let paddingStyles = "p-6"; // 24px default
  if (padding === "none") paddingStyles = "p-0";
  else if (padding === "sm") paddingStyles = "p-4";
  else if (padding === "lg") paddingStyles = "p-8";

  const shadowStyles = elevated
    ? "shadow-[var(--apple-card-shadow)]"
    : "shadow-[var(--apple-card-shadow)]";

  return (
    <div
      className={`bg-[var(--apple-card)] text-[var(--apple-label)] rounded-[16px] border border-[var(--apple-separator)] ${shadowStyles} ${paddingStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
