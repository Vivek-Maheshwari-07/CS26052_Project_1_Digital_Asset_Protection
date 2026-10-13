import * as React from 'react'
import { Check, Eye, EyeOff, Loader2, X } from 'lucide-react'

import type { Availability } from '@/auth/hooks'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FormFieldProps = React.ComponentProps<typeof Input> & {
  id: string
  label: React.ReactNode
  error?: string | null
  hint?: React.ReactNode
  /** Extra element on the label row, e.g. a "Forgot password?" link. */
  labelAside?: React.ReactNode
  /** Trailing adornment inside the input. */
  trailing?: React.ReactNode
}

export function FormField({ id, label, error, hint, labelAside, trailing, className, ...props }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      <div className="relative">
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={cn(trailing && 'pr-10', className)}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</div>}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function PasswordField(props: Omit<FormFieldProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = React.useState(false)
  return (
    <FormField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  )
}

/** Inline status icon for a field checked against the server. */
export function AvailabilityIcon({ state }: { state: Availability }) {
  switch (state.status) {
    case 'checking':
      return <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Checking availability" />
    case 'available':
      return <Check className="size-4 text-success" aria-label="Available" />
    case 'taken':
      return <X className="size-4 text-destructive" aria-label="Not available" />
    default:
      return null
  }
}
