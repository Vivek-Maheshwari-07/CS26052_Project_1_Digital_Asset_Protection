import { hexToBits } from '@/lib/hash'
import { cn } from '@/lib/utils'

type BitGridProps = {
  hash: string
  /** How many cells (row-major) have been computed so far; the rest render as pending. */
  revealed?: number
  /** Bit indexes to flag, e.g. positions that differ from another hash. */
  highlight?: Set<number>
  className?: string
}

export function BitGrid({ hash, revealed = 64, highlight, className }: BitGridProps) {
  const bits = hexToBits(hash)

  return (
    <div
      role="img"
      aria-label={`64-bit perceptual hash ${hash}`}
      className={cn('grid grid-cols-8 gap-[3px]', className)}
    >
      {bits.map((bit, i) => {
        const done = i < revealed
        const flagged = highlight?.has(i)
        return (
          <span
            key={i}
            className={cn(
              'aspect-square rounded-[2px] transition-[background-color,box-shadow] duration-300',
              !done && 'bg-muted',
              done && !flagged && (bit ? 'bg-primary shadow-[0_0_6px_var(--glow-cyan)]' : 'bg-primary/15'),
              done && flagged && 'bg-warning shadow-[0_0_6px_rgb(251_191_36/0.5)]',
            )}
          />
        )
      })}
    </div>
  )
}
