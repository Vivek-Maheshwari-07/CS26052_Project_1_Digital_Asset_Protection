import React, { useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { playTick } from "../../utils/sound";

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  showArrow?: boolean;
  children: React.ReactNode;
  className?: string;
  size?: "default" | "sm";
}

export const PillButton: React.FC<PillButtonProps> = ({
  variant = "primary",
  showArrow = true,
  children,
  className = "",
  size = "default",
  onClick,
  disabled,
  ...rest
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (shouldReduceMotion || disabled) return;
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Max 4px pull
    const pullX = Math.max(-4, Math.min(4, (e.clientX - centerX) * 0.1));
    const pullY = Math.max(-4, Math.min(4, (e.clientY - centerY) * 0.1));
    setOffset({ x: pullX, y: pullY });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playTick();
    if (onClick) onClick(e);
  };

  const variantClasses = {
    primary: "bg-(--ink) text-(--paper) hover:bg-(--ink)/90 shadow-hard-sm",
    secondary: "bg-transparent text-(--ink) border-[1.5px] border-(--ink) hover:bg-(--ink)/5",
    ghost: "bg-transparent text-(--ink-soft) hover:text-(--ink) hover:bg-(--paper-2)",
  }[variant];

  const sizeClasses = {
    default: "h-14 px-7 text-[16px]",
    sm: "h-11 px-5 text-[14px]",
  }[size];

  return (
    <motion.button
      ref={buttonRef}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      whileTap={{ scale: shouldReduceMotion ? 1 : 0.97 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-full font-mono font-bold tracking-[0.05em] uppercase select-none transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      <span>{children}</span>
      {showArrow && (
        <ArrowUpRight
          size={18}
          strokeWidth={2}
          className="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0"
          aria-hidden="true"
        />
      )}
    </motion.button>
  );
};
