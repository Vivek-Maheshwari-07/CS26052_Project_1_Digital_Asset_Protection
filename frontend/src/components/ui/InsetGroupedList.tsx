import React from "react";

export interface InsetItem {
  id?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  isMono?: boolean;
  action?: React.ReactNode;
}

export interface InsetGroupedListProps {
  items: InsetItem[];
  header?: string;
  footer?: string;
  className?: string;
}

export const InsetGroupedList: React.FC<InsetGroupedListProps> = ({
  items,
  header,
  footer,
  className = "",
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {header && (
        <div className="px-4 text-footnote font-medium text-[var(--apple-secondary-label)] uppercase tracking-wider">
          {header}
        </div>
      )}
      <div className="bg-[var(--apple-card)] rounded-[16px] border border-[var(--apple-separator)] overflow-hidden shadow-[var(--apple-card-shadow)]">
        {items.map((item, index) => (
          <div
            key={item.id ?? index}
            className={`flex items-center justify-between px-4 py-3 min-h-[44px] ${
              index < items.length - 1 ? "hairline-b" : ""
            }`}
          >
            <div className="text-subheadline text-[var(--apple-label)] font-normal">
              {item.label}
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`text-subheadline text-[var(--apple-secondary-label)] ${
                  item.isMono ? "font-mono tabular-nums select-all" : ""
                }`}
              >
                {item.value}
              </div>
              {item.action && <div>{item.action}</div>}
            </div>
          </div>
        ))}
      </div>
      {footer && (
        <div className="px-4 text-caption text-[var(--apple-secondary-label)]">
          {footer}
        </div>
      )}
    </div>
  );
};
