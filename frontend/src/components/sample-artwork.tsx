import { useId } from 'react'

import { cn } from '@/lib/utils'

type SampleArtworkProps = {
  /** `altered` recolours, crops and tilts the piece the way a reposted copy usually is. */
  variant?: 'original' | 'altered'
  className?: string
}

/** A self-contained illustration used in demos so the marketing pages ship no stock imagery. */
export function SampleArtwork({ variant = 'original', className }: SampleArtworkProps) {
  const id = useId()
  const altered = variant === 'altered'

  return (
    <svg
      viewBox="0 0 320 240"
      role="img"
      aria-label={altered ? 'Altered copy of the sample artwork' : 'Sample artwork: mountains at dusk'}
      className={cn('block h-full w-full', className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1d3a" />
          <stop offset="0.55" stopColor="#1d4e89" />
          <stop offset="1" stopColor="#f59e5b" />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-alter`}>
          <feColorMatrix type="hueRotate" values="28" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.12" />
            <feFuncG type="linear" slope="1.04" />
          </feComponentTransfer>
        </filter>
      </defs>
      <g
        filter={altered ? `url(#${id}-alter)` : undefined}
        transform={altered ? 'translate(-22 -14) scale(1.14) rotate(-2 160 120)' : undefined}
      >
        <rect width="320" height="240" fill={`url(#${id}-sky)`} />
        <circle cx="214" cy="146" r="58" fill={`url(#${id}-sun)`} />
        <circle cx="214" cy="146" r="18" fill="#fff1c7" />
        <path d="M0 176 L54 120 L92 152 L148 86 L206 160 L250 128 L320 178 V240 H0 Z" fill="#132a4a" />
        <path d="M148 86 L164 104 L156 104 L148 96 L138 108 L132 104 Z" fill="#dbe7f5" opacity="0.8" />
        <path d="M0 196 L70 158 L128 190 L190 150 L262 192 L320 170 V240 H0 Z" fill="#0b1a30" />
        <path d="M0 222 C60 206 120 230 180 214 S290 208 320 220 V240 H0 Z" fill="#06101f" />
        <g fill="#06101f">
          <path d="M40 214 l6 -22 l6 22 Z" />
          <path d="M52 216 l5 -16 l5 16 Z" />
          <path d="M268 214 l7 -26 l7 26 Z" />
        </g>
      </g>
      {altered && (
        <text x="304" y="228" textAnchor="end" fontFamily="ui-sans-serif" fontSize="11" fill="#ffffff" opacity="0.55">
          @reposted
        </text>
      )}
    </svg>
  )
}
