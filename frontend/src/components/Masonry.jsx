import { useLayoutEffect, useMemo, useRef, useState } from 'react';

const columnsFor = (width) => (width < 520 ? 2 : width < 820 ? 3 : width < 1120 ? 4 : 5);

/**
 * Pinterest-style masonry. Items flow left-to-right into whichever column is
 * currently shortest, using each item's aspect ratio (height / width).
 */
export default function Masonry({ items, getRatio, renderItem, gap = 16 }) {
  const ref = useRef(null);
  const [cols, setCols] = useState(4);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCols(columnsFor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = useMemo(() => {
    const out = Array.from({ length: cols }, () => ({ height: 0, items: [] }));
    items.forEach((item, index) => {
      const target = out.reduce((min, c) => (c.height < min.height ? c : min), out[0]);
      target.items.push({ item, index });
      target.height += getRatio(item) + 0.35; // + caption/gap allowance
    });
    return out;
  }, [items, cols, getRatio]);

  return (
    <div ref={ref} className="masonry" style={{ gap }}>
      {columns.map((col, c) => (
        <div key={c} className="masonry-col" style={{ gap }}>
          {col.items.map(({ item, index }) => renderItem(item, index))}
        </div>
      ))}
    </div>
  );
}
