import * as React from 'react'

import { cn } from '@/lib/utils'

const columnsFor = (width: number) => (width < 480 ? 1 : width < 720 ? 2 : width < 1040 ? 3 : 4)

type MasonryProps<T> = {
  items: T[]
  /** Height / width of an item's media, used to balance the columns. */
  getRatio: (item: T) => number
  renderItem: (item: T, index: number) => React.ReactNode
  getKey: (item: T) => string | number
  className?: string
}

/**
 * Balanced masonry: items go, in order, into whichever column is currently shortest.
 * Unlike CSS columns this keeps reading order roughly left-to-right.
 */
export function Masonry<T>({ items, getRatio, renderItem, getKey, className }: MasonryProps<T>) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [cols, setCols] = React.useState(3)

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setCols(columnsFor(el.clientWidth))
    const ro = new ResizeObserver(([entry]) => setCols(columnsFor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const columns = React.useMemo(() => {
    const out = Array.from({ length: cols }, () => ({ height: 0, entries: [] as { item: T; index: number }[] }))
    items.forEach((item, index) => {
      const target = out.reduce((min, c) => (c.height < min.height ? c : min), out[0])
      target.entries.push({ item, index })
      target.height += getRatio(item) + 0.45 // allowance for the caption below the media
    })
    return out
  }, [items, cols, getRatio])

  return (
    <div ref={ref} className={cn('flex items-start gap-4', className)}>
      {columns.map((col, c) => (
        <div key={c} className="flex min-w-0 flex-1 flex-col gap-4">
          {col.entries.map(({ item, index }) => (
            <React.Fragment key={getKey(item)}>{renderItem(item, index)}</React.Fragment>
          ))}
        </div>
      ))}
    </div>
  )
}
