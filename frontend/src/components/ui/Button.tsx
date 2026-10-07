import React from "react";
import { PillButton } from "./PillButton";
import type { PillButtonProps } from "./PillButton";

export interface ButtonProps
  extends Omit<PillButtonProps, "variant"> {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  showArrow,
  ...props
}) => {
  const mappedVariant = variant === "tertiary" ? "ghost" : variant === "danger" ? "primary" : variant;
  const defaultShowArrow = showArrow !== undefined ? showArrow : variant === "primary";

  return (
    <PillButton
      variant={mappedVariant}
      showArrow={defaultShowArrow}
      className={variant === "danger" ? "!bg-(--vermilion) !text-(--paper)" : ""}
      {...props}
    />
  );
};
