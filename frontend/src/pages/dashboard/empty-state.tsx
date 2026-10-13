import type * as React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UploadCloud } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EASE_OUT } from '@/lib/motion'

/** First-run state for an empty portfolio: what registering does, and one clear action. */
export function EmptyPortfolio() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      aria-labelledby="empty-title"
      className="relative isolate overflow-hidden rounded-2xl border border-dashed border-primary/25 bg-card/40 px-6 py-14 text-center sm:py-20"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid mask-radial opacity-70" />
      <div
        aria-hidden="true"
        className="absolute top-[-40%] left-1/2 -z-10 h-80 w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(34_211_238/0.12),transparent)]"
      />

      <div className="relative mx-auto mb-8 flex size-28 items-center justify-center" aria-hidden="true">
        <Corner className="top-0 left-0" />
        <Corner className="top-0 right-0 rotate-90" />
        <Corner className="right-0 bottom-0 rotate-180" />
        <Corner className="bottom-0 left-0 -rotate-90" />
        <div className="absolute inset-x-3 top-0 h-[10%] animate-scan">
          <div className="h-px bg-primary shadow-[0_0_10px_2px_var(--glow-cyan)]" />
        </div>
        <span className="flex size-14 items-center justify-center rounded-xl border bg-background text-primary">
          <UploadCloud className="size-6" />
        </span>
      </div>

      <h2 id="empty-title" className="text-2xl font-semibold tracking-tight">
        Nothing protected yet
      </h2>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        Upload an original image to fingerprint it, seal it into the registry and get a certificate with a Bitcoin
        timestamp.
      </p>
      <Button size="lg" className="mt-8" asChild>
        <Link to="/works/new">
          <UploadCloud /> Upload your first image
        </Link>
      </Button>
      <ul className="mx-auto mt-10 flex max-w-lg flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[11px] text-muted-foreground">
        <Step n={1}>fingerprint</Step>
        <Step n={2}>seal on chain</Step>
        <Step n={3}>download certificate</Step>
      </ul>
    </motion.section>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex size-5 items-center justify-center rounded-full border text-[10px] text-primary">{n}</span>
      {children}
    </li>
  )
}

function Corner({ className }: { className: string }) {
  return <span className={`absolute size-6 rounded-tl-md border-t-2 border-l-2 border-primary/70 ${className}`} />
}
