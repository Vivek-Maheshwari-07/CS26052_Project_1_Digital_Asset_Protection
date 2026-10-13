import * as React from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, ExternalLink, ScanSearch } from 'lucide-react'

import { BitGrid } from '@/components/bit-grid'
import { HashText } from '@/components/hash-text'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { certificateUrl, mediaUrl, verifyPath } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { Work } from '@/lib/models'
import { AnchorBadge } from '@/pages/dashboard/anchor-badge'
import { RemoteImage } from '@/pages/dashboard/remote-image'

type WorkDialogProps = {
  work: Work | null
  position: string
  onClose: () => void
  onPrev: (() => void) | null
  onNext: (() => void) | null
}

export function WorkDialog({ work, position, onClose, onPrev, onNext }: WorkDialogProps) {
  // Arrow keys step through works while the dialog is open.
  React.useEffect(() => {
    if (!work) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && onPrev) onPrev()
      if (e.key === 'ArrowRight' && onNext) onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [work, onPrev, onNext])

  return (
    <Dialog open={!!work} onOpenChange={(open) => !open && onClose()}>
      {work && (
        <DialogContent className="gap-0 p-0 sm:max-w-4xl" aria-describedby="work-dialog-desc">
          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <div className="flex items-center justify-center bg-background/60 p-4 md:rounded-l-xl">
              <RemoteImage
                key={work.id}
                src={mediaUrl(work.image_url)}
                alt={work.title}
                ratio={work.width && work.height ? `${work.width} / ${work.height}` : '4 / 3'}
                className="max-h-[60dvh] w-full rounded-lg"
                imgClassName="object-contain"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-5 p-6">
              <DialogHeader className="pr-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{position}</span>
                  <AnchorBadge status={work.anchor_status} />
                </div>
                <DialogTitle className="text-xl">{work.title}</DialogTitle>
                <DialogDescription id="work-dialog-desc">
                  by {work.owner_name} · registered {formatDateTime(work.created_at)}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid gap-3 rounded-lg border bg-background/50 p-4 text-xs">
                <HashRow label="Work ID" value={work.id} />
                <HashRow label="entry_hash" value={work.entry_hash} />
                <HashRow label="prev_hash" value={work.prev_hash} />
                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3">
                  <dt className="font-mono text-[11px] text-muted-foreground">pHash</dt>
                  <dd className="flex items-center gap-3">
                    <BitGrid hash={work.phash} className="w-12 shrink-0" />
                    <span className="min-w-0 space-y-0.5">
                      <HashText value={work.phash} truncate={false} label="perceptual hash" className="text-primary" />
                      {work.width && (
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {work.width} × {work.height}px
                        </span>
                      )}
                    </span>
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The entry hash covers this record and the hash of the one before it, so any later edit would break the
                chain from here on.
              </p>

              <div className="mt-auto flex flex-wrap gap-2">
                <Button asChild>
                  <a href={certificateUrl(work.id)} target="_blank" rel="noreferrer">
                    <Download /> Certificate
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={verifyPath(work.id)}>
                    <ExternalLink /> Public record
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/check">
                    <ScanSearch /> Check copies
                  </Link>
                </Button>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <Button variant="ghost" size="sm" onClick={onPrev ?? undefined} disabled={!onPrev}>
                  <ChevronLeft /> Previous
                </Button>
                <Button variant="ghost" size="sm" onClick={onNext ?? undefined} disabled={!onNext}>
                  Next <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3">
      <dt className="font-mono text-[11px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0">
        {value === 'GENESIS' ? (
          <span className="font-mono text-[0.8125rem] text-muted-foreground">GENESIS</span>
        ) : (
          <HashText value={value} truncate={10} label={label} copyable />
        )}
      </dd>
    </div>
  )
}
