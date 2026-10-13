import { Clock, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

/**
 * OpenTimestamps state of a work's entry hash (backend/app/registry/anchor.py): `pending` means a
 * calendar accepted the hash and returned a proof awaiting Bitcoin confirmation; `failed` means no
 * calendar answered, and the backend retries on its next start. No status: anchoring is switched off.
 */
export function AnchorBadge({ status }: { status: string | null }) {
  if (status === 'pending')
    return (
      <Badge variant="warning" title="Hash submitted via OpenTimestamps; awaiting Bitcoin confirmation">
        <Clock /> Bitcoin pending
      </Badge>
    )
  if (status === 'failed')
    return (
      <Badge variant="destructive" title="No timestamp calendar answered; retried when the server restarts">
        <TriangleAlert /> Timestamp failed
      </Badge>
    )
  return null
}
