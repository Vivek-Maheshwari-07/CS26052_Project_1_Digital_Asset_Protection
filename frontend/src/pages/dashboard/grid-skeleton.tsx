import { Masonry } from '@/components/masonry'
import { Skeleton } from '@/components/ui/skeleton'

const RATIOS = [1.25, 0.8, 1.4, 1, 0.75, 1.2, 0.95, 1.3]

export function GridSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Masonry
        items={RATIOS.map((r, i) => ({ r, i }))}
        getKey={(x) => x.i}
        getRatio={(x) => x.r}
        renderItem={(x) => (
          <div className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="rounded-none" style={{ aspectRatio: `1 / ${x.r}` }} />
            <div className="space-y-2 p-3.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        )}
      />
    </div>
  )
}
