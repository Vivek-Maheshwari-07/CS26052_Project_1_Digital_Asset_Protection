import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

type Tone = 'primary' | 'success' | 'warning' | 'muted'

const TONE: Record<Tone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  muted: 'text-muted-foreground',
}

type ScoreRingProps = {
  /** Similarity in [0, 1]. */
  value: number
  label: string
  /** Raw measurement shown under the ring, e.g. `6 / 64 bits` or `cos 0.941`. */
  detail?: string
  tone?: Tone
  size?: number
  className?: string
}

export function ScoreRing({ value, label, detail, tone = 'primary', size = 112, className }: ScoreRingProps) {
  const clamped = Math.min(1, Math.max(0, value))
  const stroke = 6
  const r = (size - stroke) / 2
  const pct = Math.round(clamped * 1000) / 10

  return (
    <figure className={cn('flex flex-col items-center gap-2', className)}>
      <div className={cn('relative', TONE[tone])} style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r - stroke - 3}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.18}
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: clamped }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-semibold text-foreground tabular-nums">{pct}%</span>
        </div>
      </div>
      <figcaption className="text-center">
        <div className="text-sm font-medium">{label}</div>
        {detail && <div className="font-mono text-xs text-muted-foreground">{detail}</div>}
      </figcaption>
      <span className="sr-only">
        {label}: {pct} percent{detail ? `, ${detail}` : ''}
      </span>
    </figure>
  )
}
