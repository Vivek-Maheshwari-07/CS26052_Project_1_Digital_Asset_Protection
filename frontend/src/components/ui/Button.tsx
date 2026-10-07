import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all select-none btn-press apple-focus cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

  let sizeStyles = "min-h-[44px] px-4 py-2.5 rounded-[12px] text-body";
  if (size === "sm") {
    sizeStyles = "min-h-[36px] px-3 py-1.5 rounded-[10px] text-subheadline";
  } else if (size === "lg") {
    sizeStyles = "min-h-[50px] px-6 py-3 rounded-[14px] text-headline";
  }

  let variantStyles = "";
  switch (variant) {
    case "primary":
      variantStyles =
        "bg-[var(--apple-accent)] text-white hover:brightness-105 shadow-sm active:brightness-95";
      break;
    case "secondary":
      variantStyles =
        "bg-[var(--apple-accent-subtle)] text-[var(--apple-accent)] hover:opacity-90 active:opacity-100";
      break;
    case "tertiary":
      variantStyles =
        "bg-transparent text-[var(--apple-accent)] hover:bg-[var(--apple-grouped-background)]";
      break;
    case "danger":
      variantStyles =
        "bg-[var(--apple-danger)] text-white hover:brightness-105 active:brightness-95";
      break;
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin stroke-[1.75]" />
      ) : icon ? (
        <span className="mr-2 inline-flex items-center">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
