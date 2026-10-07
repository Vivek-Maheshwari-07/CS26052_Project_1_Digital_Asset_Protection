import React, { useEffect } from "react";
import { X } from "lucide-react";
import { playTick } from "../../utils/sound";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: "default" | "large";
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  size = "default",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidth = size === "large" ? "max-w-3xl" : "max-w-xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-(--ink)/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          playTick();
          onClose();
        }}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${maxWidth} bg-(--paper) border-2 border-(--ink) rounded-2xl shadow-hard-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--rule) bg-(--paper-2)">
          <h2
            id="sheet-title"
            className="font-display text-[22px] font-normal text-(--ink) m-0"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={() => {
              playTick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-(--paper) border border-(--rule) flex items-center justify-center text-(--ink) hover:bg-(--ink) hover:text-(--paper) transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
