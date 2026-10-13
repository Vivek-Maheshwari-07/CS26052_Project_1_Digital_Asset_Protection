import type * as React from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function SubmitButton({
  loading,
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={loading || disabled} aria-busy={loading} {...props}>
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  )
}
