import type * as React from 'react'

import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  index: string
  eyebrow: string
  title: React.ReactNode
  children?: React.ReactNode
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({ index, eyebrow, title, children, align = 'left', className }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-2xl space-y-4', align === 'center' && 'mx-auto text-center', className)}>
      <p className="font-mono text-xs tracking-wider text-primary uppercase">
        <span className="text-muted-foreground">{index} /</span> {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {children && <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{children}</p>}
    </div>
  )
}
