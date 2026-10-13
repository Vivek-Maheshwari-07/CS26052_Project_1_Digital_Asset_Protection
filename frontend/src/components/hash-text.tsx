import * as React from 'react'
import { Check, Copy } from 'lucide-react'

import { truncateMiddle } from '@/lib/format'
import { cn } from '@/lib/utils'

type HashTextProps = {
  value: string
  /** Characters kept on each side; pass `false` to show the full value. */
  truncate?: number | false
  copyable?: boolean
  label?: string
  className?: string
}

/**
 * The only way hashes, IDs and other machine values are rendered: always monospace,
 * middle-truncated so both ends stay comparable, full value in the tooltip and clipboard.
 */
export function HashText({ value, truncate = 6, copyable = false, label, className }: HashTextProps) {
  const [copied, setCopied] = React.useState(false)
  const shown = truncate === false ? value : truncateMiddle(value, truncate, truncate)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      // Clipboard can be unavailable (insecure origin); the value is still selectable.
    }
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 font-mono text-[0.8125rem] tracking-tight', className)}>
      <span className="truncate tabular-nums" title={value} aria-label={label ? `${label}: ${value}` : value}>
        {shown}
      </span>
      {copyable && (
        <button
          type="button"
          onClick={copy}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-primary"
          aria-label={copied ? 'Copied' : `Copy ${label ?? 'value'}`}
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </span>
  )
}
