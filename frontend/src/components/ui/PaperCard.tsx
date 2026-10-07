import React from "react";

export interface PaperCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  important?: boolean;
  className?: string;
}

export const PaperCard: React.FC<PaperCardProps> = ({
  children,
  important = false,
  className = "",
  ...rest
}) => {
  return (
    <div
      className={`bg-(--paper-2) border border-(--rule) rounded-[20px] p-6 transition-all duration-200 ${
        important ? "shadow-hard" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
