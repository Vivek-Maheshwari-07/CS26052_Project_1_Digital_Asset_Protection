import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, ScanSearch } from 'lucide-react'

import { HashText } from '@/components/hash-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mediaUrl } from '@/lib/api'
import { percent, relativeTime } from '@/lib/format'
import type { CheckSummary } from '@/lib/models'
import { RemoteImage } from '@/pages/dashboard/remote-image'
import { VERDICT_META } from '@/pages/dashboard/verdict'

export function CheckHistory({ checks }: { checks: CheckSummary[] }) {
  if (checks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card/30 px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border bg-background text-primary">
          <ScanSearch className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h2 className="font-semibold">No checks yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Found a suspicious image online? Check it against your registered works. Every result is kept here.
          </p>
        </div>
        <Button asChild>
          <Link to="/check">
            <ScanSearch /> Check an image
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {checks.map((c, i) => {
        const meta = VERDICT_META[c.top_verdict] ?? VERDICT_META.no_match
        return (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.03 }}
          >
            <Link
              to={`/check/${c.id}`}
              className="group flex items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-accent/50 focus-visible:bg-accent/50"
            >
              <RemoteImage
                src={mediaUrl(c.query_image_url)}
                alt=""
                ratio="1 / 1"
                className="w-12 shrink-0 rounded-md border"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {c.top_verdict === 'no_match' || !c.top_title ? 'No match found' : `Matched “${c.top_title}”`}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="truncate">{c.filename || 'Uploaded image'}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={c.created_at}>{relativeTime(c.created_at)}</time>
                  <span aria-hidden="true" className="hidden sm:inline">·</span>
                  <HashText value={c.query_phash} truncate={false} label="query pHash" className="hidden text-[11px] sm:inline-flex" />
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-mono text-sm tabular-nums">{percent(c.top_confidence)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.match_count} match{c.match_count === 1 ? '' : 'es'}
                </p>
              </div>
              <Badge variant={meta.badge}>{meta.label}</Badge>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </motion.li>
        )
      })}
    </ul>
  )
}
