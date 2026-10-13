import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Clock, Images, LayoutGrid, RotateCw, ScanSearch, Search, ShieldAlert, UploadCloud, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useAuth } from '@/auth/auth-context'
import { Masonry } from '@/components/masonry'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { greeting, relativeTime } from '@/lib/format'
import type { CheckSummary, Work } from '@/lib/models'
import { useApi } from '@/lib/use-api'
import { cn } from '@/lib/utils'
import { CheckHistory } from '@/pages/dashboard/check-history'
import { EmptyPortfolio } from '@/pages/dashboard/empty-state'
import { GridSkeleton } from '@/pages/dashboard/grid-skeleton'
import { SampleLibrary } from '@/pages/dashboard/sample-library'
import { WorkCard } from '@/pages/dashboard/work-card'
import { WorkDialog } from '@/pages/dashboard/work-dialog'

type Tab = 'works' | 'checks' | 'samples'
type Sort = 'newest' | 'oldest' | 'title'

const TABS: Tab[] = ['works', 'checks', 'samples']
const SORTS: Record<Sort, { label: string; compare: (a: Work, b: Work) => number }> = {
  newest: { label: 'Newest', compare: (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) },
  oldest: { label: 'Oldest', compare: (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) },
  title: { label: 'A–Z', compare: (a, b) => a.title.localeCompare(b.title) },
}

export function DashboardPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'works'
  const setTab = (t: string) => setParams(t === 'works' ? {} : { tab: t }, { replace: true })

  const [works, reloadWorks] = useApi<Work[]>('/api/works')
  const [checks, reloadChecks] = useApi<CheckSummary[]>('/api/checks')

  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState<Sort>('newest')
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [measured, setMeasured] = React.useState<Record<string, number>>({})

  const allWorks = React.useMemo(() => works.data ?? [], [works.data])
  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return allWorks
      .filter((w) => !q || w.title.toLowerCase().includes(q) || w.owner_name.toLowerCase().includes(q))
      .sort(SORTS[sort].compare)
  }, [allWorks, query, sort])

  const getRatio = React.useCallback(
    (w: Work) => (w.width && w.height ? w.height / w.width : (measured[w.id] ?? 1.25)),
    [measured],
  )
  const onMeasured = React.useCallback(
    (id: string, r: number) => setMeasured((m) => (m[id] ? m : { ...m, [id]: r })),
    [],
  )

  const openIndex = visible.findIndex((w) => w.id === openId)
  const openWork = openIndex >= 0 ? visible[openIndex] : null

  const latest = allWorks.reduce<string | null>(
    (acc, w) => (!acc || Date.parse(w.created_at) > Date.parse(acc) ? w.created_at : acc),
    null,
  )
  const checkList = checks.data ?? []
  const flagged = checkList.filter((c) => c.top_verdict !== 'no_match').length
  const firstName = (user?.full_name || user?.username || '').split(' ')[0]

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-wider text-primary uppercase">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Your protected assets</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Everything you have registered, sealed in the hash chain, plus every copy you have checked.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/check">
              <ScanSearch /> Check a copy
            </Link>
          </Button>
          <Button asChild>
            <Link to="/works/new">
              <UploadCloud /> Protect an asset
            </Link>
          </Button>
        </div>
      </header>

      <section aria-label="Summary" className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat
          icon={LayoutGrid}
          label="Protected assets"
          value={works.status === 'ready' ? String(allWorks.length) : null}
        />
        <Stat
          icon={ShieldAlert}
          label={
            checks.status === 'ready'
              ? `Copies found in ${checkList.length} check${checkList.length === 1 ? '' : 's'}`
              : 'Copies found'
          }
          value={checks.status === 'ready' ? String(flagged) : null}
          tone={flagged > 0 ? 'warning' : undefined}
          onClick={() => setTab('checks')}
        />
        <Stat
          icon={Clock}
          label="Last registration"
          value={works.status === 'ready' ? (latest ? relativeTime(latest) : '—') : null}
        />
      </section>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="works">
              <LayoutGrid /> <Short short="Assets" long="My assets" /> <Count n={works.data?.length} />
            </TabsTrigger>
            <TabsTrigger value="checks">
              <ScanSearch /> <Short short="Checks" long="Check history" /> <Count n={checks.data?.length} />
            </TabsTrigger>
            <TabsTrigger value="samples">
              <Images /> Samples
            </TabsTrigger>
          </TabsList>

          {tab === 'works' && allWorks.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title or owner"
                  aria-label="Search your assets"
                  className="h-9 pr-9 pl-9 sm:w-64"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <div role="group" aria-label="Sort assets" className="inline-flex rounded-md border bg-card p-0.5">
                {(Object.keys(SORTS) as Sort[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={sort === k}
                    onClick={() => setSort(k)}
                    className={cn(
                      'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                      sort === k ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {SORTS[k].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <TabsContent value="works">
          {works.status === 'loading' ? (
            <GridSkeleton />
          ) : works.status === 'error' ? (
            <LoadError title="We couldn't load your assets" message={works.error} onRetry={reloadWorks} />
          ) : allWorks.length === 0 ? (
            <EmptyPortfolio />
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No assets match “<span className="text-foreground">{query}</span>”.
              </p>
              <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                Clear search
              </Button>
            </div>
          ) : (
            <Masonry
              items={visible}
              getKey={(w) => w.id}
              getRatio={getRatio}
              renderItem={(w, i) => (
                <WorkCard work={w} index={i} ratio={getRatio(w)} onOpen={setOpenId} onMeasured={onMeasured} />
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="checks">
          {checks.status === 'loading' ? (
            <div className="space-y-2" role="status" aria-label="Loading">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
              ))}
            </div>
          ) : checks.status === 'error' ? (
            <LoadError title="We couldn't load your check history" message={checks.error} onRetry={reloadChecks} />
          ) : (
            <CheckHistory checks={checkList} />
          )}
        </TabsContent>

        <TabsContent value="samples">
          <SampleLibrary />
        </TabsContent>
      </Tabs>

      <WorkDialog
        work={openWork}
        position={openWork ? `${openIndex + 1} of ${visible.length}` : ''}
        onClose={() => setOpenId(null)}
        onPrev={openIndex > 0 ? () => setOpenId(visible[openIndex - 1].id) : null}
        onNext={openIndex >= 0 && openIndex < visible.length - 1 ? () => setOpenId(visible[openIndex + 1].id) : null}
      />
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: string | null
  tone?: 'warning'
  onClick?: () => void
}) {
  const body = (
    <>
      <span
        className={cn(
          'hidden size-10 shrink-0 items-center justify-center rounded-lg border bg-background sm:flex',
          tone === 'warning' ? 'text-warning' : 'text-primary',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-left">
        {value === null ? (
          <Skeleton className="mb-1 h-6 w-12" />
        ) : (
          <span className="block truncate font-mono text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">{value}</span>
        )}
        <span className="block text-[11px] leading-snug text-muted-foreground sm:truncate sm:text-xs">{label}</span>
      </span>
    </>
  )
  const cls = 'flex min-w-0 items-center gap-4 rounded-xl border bg-card p-3 sm:p-4'
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'transition-colors hover:border-primary/30')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** A shorter label on phones so the tab row fits; only the visible one is announced. */
function Short({ short, long }: { short: string; long: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{long}</span>
    </>
  )
}

function Count({ n }: { n?: number }) {
  if (n === undefined) return null
  return <span className="rounded-full bg-background px-1.5 font-mono text-[10px] text-muted-foreground tabular-nums">{n}</span>
}

function LoadError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <ShieldAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        {message}
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      </AlertDescription>
    </Alert>
  )
}
