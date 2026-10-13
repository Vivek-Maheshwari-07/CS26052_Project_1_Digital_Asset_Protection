import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] transition-colors',
                done && 'border-success/50 bg-success/15 text-success',
                active && 'border-primary/60 bg-primary/10 text-primary',
                !done && !active && 'text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn('truncate text-xs', active ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
              {done && <span className="sr-only"> (completed)</span>}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('h-px flex-1', done ? 'bg-success/40' : 'bg-border')} aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
