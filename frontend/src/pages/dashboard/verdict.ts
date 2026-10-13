import type { Verdict } from '@/lib/models'

/** Labels for a check's fused verdict (backend/app/fingerprint/combine.py thresholds). */
export const VERDICT_META: Record<Verdict, { label: string; badge: 'destructive' | 'warning' | 'outline' }> = {
  likely_match: { label: 'Likely copy', badge: 'destructive' },
  possible_match: { label: 'Possible copy', badge: 'warning' },
  no_match: { label: 'No match', badge: 'outline' },
}
