import * as React from 'react'

import { apiClient } from '@/lib/api'

export type ApiState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'error'; data?: undefined; error: string }
  | { status: 'ready'; data: T; error?: undefined }

/** GET an endpoint on mount (and on `reload()`); ignores responses that arrive after unmount. */
export function useApi<T>(endpoint: string | null) {
  const [state, setState] = React.useState<ApiState<T>>({ status: 'loading' })
  const [nonce, setNonce] = React.useState(0)
  const [prev, setPrev] = React.useState({ endpoint, nonce })

  if (prev.endpoint !== endpoint || prev.nonce !== nonce) {
    setPrev({ endpoint, nonce })
    setState({ status: 'loading' })
  }

  React.useEffect(() => {
    if (!endpoint) return
    let cancelled = false
    apiClient<T>(endpoint)
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((err: Error) => !cancelled && setState({ status: 'error', error: err.message }))
    return () => {
      cancelled = true
    }
  }, [endpoint, nonce])

  const reload = React.useCallback(() => setNonce((n) => n + 1), [])
  return [state, reload] as const
}
