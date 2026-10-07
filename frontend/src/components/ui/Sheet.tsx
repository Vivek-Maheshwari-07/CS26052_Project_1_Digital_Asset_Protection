import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let widthClass = "max-w-lg";
  if (maxWidth === "sm") widthClass = "max-w-md";
  else if (maxWidth === "lg") widthClass = "max-w-2xl";
  else if (maxWidth === "xl") widthClass = "max-w-3xl";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--apple-dim-backdrop)] transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} material-modal rounded-[16px] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-[var(--apple-label)] transition-all duration-350 ease-[cubic-bezier(0.25,0.1,0.25,1)]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 hairline-b">
          <div>
            {title && <h2 className="text-headline font-semibold">{title}</h2>}
            {subtitle && (
              <p className="text-footnote text-[var(--apple-secondary-label)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-[var(--apple-secondary-label)] hover:text-[var(--apple-label)] hover:bg-[var(--apple-grouped-background)] apple-focus cursor-pointer transition-colors"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end px-6 py-3.5 hairline-t bg-[var(--apple-grouped-background)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
