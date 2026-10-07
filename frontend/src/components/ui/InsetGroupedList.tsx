import React from "react";

export interface InsetGroupedItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export interface InsetGroupedListProps {
  items: InsetGroupedItem[];
  className?: string;
}

export const InsetGroupedList: React.FC<InsetGroupedListProps> = ({
  items,
  className = "",
}) => {
  return (
    <div
      className={`bg-(--paper-2) border border-(--rule) rounded-2xl overflow-hidden divide-y divide-(--rule) shadow-xs ${className}`}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between px-4 py-3 text-[14px]"
        >
          <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-(--ink-soft)">
            {item.label}
          </span>
          <span
            className={`text-right text-(--ink) select-all max-w-[65%] truncate ${
              item.mono !== false ? "font-mono tabular-nums text-[13px]" : ""
            }`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};
