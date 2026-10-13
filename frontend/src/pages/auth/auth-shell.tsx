import type * as React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Fingerprint, Link2, ShieldCheck } from 'lucide-react'

import { BitGrid } from '@/components/bit-grid'
import { Brand } from '@/components/brand'
import { HashText } from '@/components/hash-text'
import { EASE_OUT } from '@/lib/motion'

const POINTS = [
  { icon: Fingerprint, text: 'Every upload is fingerprinted with a perceptual hash and visual embeddings.' },
  { icon: Link2, text: 'Records are chained by hash, so history cannot be quietly rewritten.' },
  { icon: ShieldCheck, text: 'Checks return graded evidence, never just a similarity score.' },
]

type AuthShellProps = {
  title: string
  description: React.ReactNode
  children: React.ReactNode
  /** Rendered above the title, e.g. a step indicator. */
  eyebrow?: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({ title, description, children, eyebrow, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative isolate hidden overflow-hidden border-r bg-card/40 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid mask-fade-y" />
        <div
          aria-hidden="true"
          className="absolute bottom-[-30%] left-[-20%] -z-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(34_211_238/0.12),transparent)]"
        />
        <Brand />

        <div className="space-y-8">
          <div className="space-y-3">
            <p className="font-mono text-xs tracking-wider text-primary uppercase">ProvNet registry</p>
            <h2 className="max-w-md text-3xl font-semibold tracking-tight text-balance">
              Your work, on the record before anyone copies it.
            </h2>
          </div>
          <ul className="max-w-md space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex gap-3 text-sm text-muted-foreground">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-primary">
                  <p.icon className="size-3.5" aria-hidden="true" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex max-w-md items-center gap-4 rounded-xl border bg-background/60 p-4 backdrop-blur" aria-hidden="true">
          <BitGrid hash="c3a1f0e8963c5a1d" className="w-16 shrink-0" />
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-success">
              <ShieldCheck className="size-3.5" /> Sealed · example entry
            </div>
            <HashText value="9f2c4e7a1b83d06e5c1f9a4b7d2e8c3061a5f7b9e2d4c8a0f3b6e1d9c7a5b2e4" truncate={10} className="text-muted-foreground" />
          </div>
        </div>
      </aside>

      <main id="main" className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Brand className="lg:invisible" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10"
        >
          {eyebrow}
          <div className="mb-8 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
          {children}
          {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
        </motion.div>
      </main>
    </div>
  )
}
