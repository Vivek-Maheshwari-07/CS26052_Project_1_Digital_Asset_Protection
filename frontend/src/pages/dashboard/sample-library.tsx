import * as React from 'react'
import { Info, RotateCw } from 'lucide-react'

import { Masonry } from '@/components/masonry'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { apiClient, mediaUrl } from '@/lib/api'
import type { SampleItem, SamplePage } from '@/lib/models'
import { GridSkeleton } from '@/pages/dashboard/grid-skeleton'
import { RemoteImage } from '@/pages/dashboard/remote-image'

const PAGE = 40

/** Placeholder works served by GET /api/discover, used to exercise the registry at scale. */
export function SampleLibrary() {
  const [items, setItems] = React.useState<SampleItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [next, setNext] = React.useState<number | null>(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchPage = React.useCallback(
    (offset: number) =>
      apiClient<SamplePage>(`/api/discover?offset=${offset}&limit=${PAGE}`)
        .then((r) => {
          setItems((prev) => (offset === 0 ? r.items : [...prev, ...r.items]))
          setTotal(r.total)
          setNext(r.next_offset)
          setError(null)
        })
        .catch((e: Error) => setError(e.message || 'Could not load the sample library.'))
        .finally(() => setLoading(false)),
    [],
  )

  const load = (offset: number) => {
    setLoading(true)
    setError(null)
    fetchPage(offset)
  }

  React.useEffect(() => {
    void fetchPage(0)
  }, [fetchPage])

  const ratio = React.useCallback((i: SampleItem) => i.height / i.width, [])

  if (error && items.length === 0) {
    return (
      <Alert variant="destructive">
        <Info />
        <AlertDescription className="flex flex-wrap items-center gap-3">
          {error}
          <Button size="sm" variant="outline" onClick={() => load(0)}>
            <RotateCw /> Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  if (items.length === 0 && loading) return <GridSkeleton />
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No sample images are configured on this server.</p>
  }

  return (
    <div className="space-y-5">
      <Alert variant="info">
        <Info />
        <AlertDescription>
          Sample library: {total} placeholder works used to test the registry at scale. Titles and creators are generated
          labels.
        </AlertDescription>
      </Alert>
      <Masonry
        items={items}
        getKey={(i) => i.id}
        getRatio={ratio}
        renderItem={(item) => (
          <figure className="overflow-hidden rounded-xl border bg-card">
            <a href={mediaUrl(item.image_url) ?? undefined} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}>
              <RemoteImage src={mediaUrl(item.image_url)} alt={item.title} ratio={`${item.width} / ${item.height}`} />
            </a>
            <figcaption className="space-y-0.5 p-3">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.creator}</p>
            </figcaption>
          </figure>
        )}
      />
      {next !== null && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load(next)} disabled={loading}>
            {loading ? 'Loading…' : 'Show more'}
          </Button>
        </div>
      )}
    </div>
  )
}
