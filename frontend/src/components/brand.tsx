import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('size-7', className)}>
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" className="fill-card stroke-border" />
      <path
        d="M8 12V8h4M20 8h4v4M24 20v4h-4M12 24H8v-4"
        className="stroke-primary"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="13" y="13" width="6" height="6" rx="1.2" className="fill-success" />
    </svg>
  )
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('group inline-flex items-center gap-2.5', className)} aria-label="ProvNet home">
      <BrandMark className="transition-transform duration-300 group-hover:rotate-90" />
      <span className="text-[15px] font-semibold tracking-tight">
        Prov<span className="text-primary">Net</span>
      </span>
    </Link>
  )
}
