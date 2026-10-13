import * as React from 'react'

import { apiClient } from '@/lib/api'

/** Seconds left before a code can be re-sent. `key` restarts the timer for the same duration. */
export function useCountdown(seconds: number, key: number): number {
  const [left, setLeft] = React.useState(seconds)
  const [prev, setPrev] = React.useState({ seconds, key })

  if (prev.seconds !== seconds || prev.key !== key) {
    setPrev({ seconds, key })
    setLeft(seconds)
  }

  React.useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [left])

  return left
}

export type Availability =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'taken'; reason: string }
  | { status: 'unknown' }

type AvailabilityResponse = Partial<Record<'username' | 'email', { available: boolean; reason?: string }>>

/** Debounced check against GET /api/auth/availability. Only runs once the value is well-formed. */
export function useAvailability(field: 'username' | 'email', value: string, wellFormed: boolean): Availability {
  const [result, setResult] = React.useState<{ value: string; state: Availability } | null>(null)
  const trimmed = value.trim()

  React.useEffect(() => {
    if (!wellFormed) return
    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        const r = await apiClient<AvailabilityResponse>(
          `/api/auth/availability?${field}=${encodeURIComponent(trimmed)}`,
        )
        const info = r[field]
        if (cancelled || !info) return
        setResult({
          value: trimmed,
          state: info.available
            ? { status: 'available' }
            : {
                status: 'taken',
                reason:
                  info.reason ??
                  (field === 'email' ? 'An account with this email already exists' : 'That username is taken'),
              },
        })
      } catch {
        // Could not verify (server unreachable): don't block, signup/start re-checks.
        if (!cancelled) setResult({ value: trimmed, state: { status: 'unknown' } })
      }
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [field, trimmed, wellFormed])

  if (!wellFormed) return { status: 'idle' }
  if (!result || result.value !== trimmed) return { status: 'checking' }
  return result.state
}
