import { ShieldAlert, ShieldCheck } from 'lucide-react'

import { HashText } from '@/components/hash-text'
import type { RegistryStatus } from '@/lib/models'
import { useApi } from '@/lib/use-api'
import { cn } from '@/lib/utils'

/** Integrity of the whole hash chain, recomputed by the backend (cached for a few seconds). */
export function RegistryStatusCard({ className }: { className?: string }) {
  const [state] = useApi<RegistryStatus>('/api/registry/status')
  if (state.status !== 'ready') return null
  const s = state.data

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border p-3 text-xs',
        s.valid ? 'border-success/20 bg-success/[0.04]' : 'border-destructive/30 bg-destructive/[0.06]',
        className,
      )}
    >
      <div className={cn('flex items-center gap-1.5 font-medium', s.valid ? 'text-success' : 'text-destructive')}>
        {s.valid ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
        {s.valid ? 'Registry intact' : 'Integrity check failed'}
      </div>
      <p className="text-muted-foreground">
        <span className="font-mono text-foreground tabular-nums">{s.length}</span> {s.length === 1 ? 'entry' : 'entries'}{' '}
        verified
      </p>
      {s.head_hash && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="font-mono text-[10px] uppercase">head</span>
          <HashText value={s.head_hash} truncate={6} label="latest entry hash" copyable className="text-[11px]" />
        </div>
      )}
    </div>
  )
}
