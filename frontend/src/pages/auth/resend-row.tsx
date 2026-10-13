import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ResendRowProps = {
  countdown: number
  onBack: () => void
  backLabel: string
  onResend: () => void
  resending?: boolean
}

export function ResendRow({ countdown, onBack, backLabel, onResend, resending }: ResendRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <Button type="button" variant="ghost" size="sm" className="-ml-3 text-muted-foreground" onClick={onBack}>
        <ArrowLeft /> {backLabel}
      </Button>
      {countdown > 0 ? (
        <span className="font-mono text-xs text-muted-foreground tabular-nums" aria-live="off">
          Resend in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
        </span>
      ) : (
        <Button type="button" variant="link" size="sm" className="-mr-3" onClick={onResend} disabled={resending}>
          Resend code
        </Button>
      )}
    </div>
  )
}
