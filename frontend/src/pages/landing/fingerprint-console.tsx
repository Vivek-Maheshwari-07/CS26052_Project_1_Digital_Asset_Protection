import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Fingerprint, Link2, ShieldCheck } from 'lucide-react'

import { BitGrid } from '@/components/bit-grid'
import { HashText } from '@/components/hash-text'
import { SampleArtwork } from '@/components/sample-artwork'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SAMPLE } from '@/pages/landing/sample-record'

type Phase = 'scanning' | 'hashing' | 'sealed'

const BIT_STEP_MS = 34
const CHAR_STEP_MS = 18
const HOLD_MS = 2600

/**
 * The hero visual: an image is scanned into a 64-bit perceptual hash, its SHA-256 is computed,
 * and the record is sealed onto the chain. Loops; reduced-motion users see the sealed state.
 */
export function FingerprintConsole() {
  const reduce = useReducedMotion()
  const [bits, setBits] = React.useState(reduce ? 64 : 0)
  const [chars, setChars] = React.useState(reduce ? 64 : 0)
  const phase: Phase = bits < 64 ? 'scanning' : chars < 64 ? 'hashing' : 'sealed'

  React.useEffect(() => {
    if (reduce) return
    let t: number
    if (phase === 'scanning') t = window.setTimeout(() => setBits((b) => b + 1), BIT_STEP_MS)
    else if (phase === 'hashing') t = window.setTimeout(() => setChars((c) => c + 2), CHAR_STEP_MS)
    else
      t = window.setTimeout(() => {
        setBits(0)
        setChars(0)
      }, HOLD_MS)
    return () => window.clearTimeout(t)
  }, [phase, bits, chars, reduce])

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/40 via-primary/5 to-success/30 opacity-60 blur-[1px]"
      />
      <div className="relative overflow-hidden rounded-2xl border bg-card/95 shadow-2xl shadow-black/60 backdrop-blur">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">provnet · register · example</span>
          <PhaseBadge phase={phase} />
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[1.25fr_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border">
            <SampleArtwork />
            {phase === 'scanning' && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[10%] animate-scan">
                <div className="h-full bg-gradient-to-b from-transparent to-primary/35" />
                <div className="h-px bg-primary shadow-[0_0_12px_2px_var(--glow-cyan)]" />
              </div>
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-md">
              <Corner className="top-0 left-0" />
              <Corner className="top-0 right-0 rotate-90" />
              <Corner className="right-0 bottom-0 rotate-180" />
              <Corner className="bottom-0 left-0 -rotate-90" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Perceptual hash</span>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{bits}/64</span>
            </div>
            <BitGrid hash={SAMPLE.phash} revealed={bits} className="w-full max-w-[200px] self-center sm:max-w-none" />
            <HashText value={SAMPLE.phash} truncate={false} label="pHash" className="text-primary" />
          </div>
        </div>

        <div className="space-y-2 border-t bg-background/40 px-4 py-3">
          <Row label="SHA-256">
            <span className="block truncate font-mono text-[12px] text-foreground/90" aria-label="SHA-256 digest">
              {SAMPLE.sha256.slice(0, chars)}
              {phase === 'hashing' && <span className="animate-blink text-primary">▍</span>}
              <span className="text-muted-foreground/30">{'·'.repeat(Math.max(0, 64 - chars))}</span>
            </span>
          </Row>
          <Row label="prev_hash">
            <HashText value={SAMPLE.prevHash} truncate={10} label="previous entry hash" className="text-muted-foreground" />
          </Row>
        </div>

        <AnimatePresence>
          {phase === 'sealed' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-center justify-between gap-3 border-t border-success/20 bg-success/[0.06] px-4 py-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <ShieldCheck className="size-4" /> Sealed in registry
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <Link2 className="size-3" /> entry #{SAMPLE.blockHeight}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function PhaseBadge({ phase }: { phase: Phase }) {
  if (phase === 'sealed')
    return (
      <Badge variant="success" className="font-mono text-[10px]">
        <ShieldCheck /> sealed
      </Badge>
    )
  return (
    <Badge className="font-mono text-[10px]">
      <Fingerprint className="animate-pulse" /> {phase}
    </Badge>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
      <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function Corner({ className }: { className?: string }) {
  return <span className={cn('absolute size-4 border-t-2 border-l-2 border-primary/80', className)} />
}
