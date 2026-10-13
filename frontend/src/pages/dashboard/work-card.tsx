import { motion } from 'framer-motion'
import { Download } from 'lucide-react'

import { HashText } from '@/components/hash-text'
import { certificateUrl, mediaUrl } from '@/lib/api'
import { relativeTime } from '@/lib/format'
import type { Work } from '@/lib/models'
import { AnchorBadge } from '@/pages/dashboard/anchor-badge'
import { RemoteImage } from '@/pages/dashboard/remote-image'

type WorkCardProps = {
  work: Work
  index: number
  ratio: number
  onOpen: (id: string) => void
  onMeasured: (id: string, ratio: number) => void
}

export function WorkCard({ work, index, ratio, onOpen, onMeasured }: WorkCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.04 }}
      className="group relative overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-300 hover:border-primary/35 hover:shadow-[0_12px_40px_-16px_var(--glow-cyan)]"
    >
      <button
        type="button"
        onClick={() => onOpen(work.id)}
        className="block w-full text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
        aria-label={`Open details for ${work.title}`}
      >
        <RemoteImage
          src={mediaUrl(work.image_url)}
          alt={work.title}
          ratio={`1 / ${ratio}`}
          imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
          onMeasured={work.width ? undefined : (r) => onMeasured(work.id, r)}
        />
      </button>

      <a
        href={certificateUrl(work.id)}
        target="_blank"
        rel="noreferrer"
        className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-md border bg-background/70 text-muted-foreground opacity-0 backdrop-blur transition-[opacity,color] group-focus-within:opacity-100 group-hover:opacity-100 hover:text-primary focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        aria-label={`Download certificate for ${work.title}`}
        title="Download certificate"
      >
        <Download className="size-4" />
      </a>

      <div className="space-y-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold" title={work.title}>
            {work.title}
          </h3>
          <time dateTime={work.created_at} className="shrink-0 text-xs text-muted-foreground">
            {relativeTime(work.created_at)}
          </time>
        </div>
        <div className="flex items-center justify-between gap-2">
          <HashText value={work.entry_hash} truncate={6} label="entry hash" className="text-xs text-muted-foreground" />
          <AnchorBadge status={work.anchor_status} />
        </div>
      </div>
    </motion.article>
  )
}
