import type * as React from 'react'
import { ArrowLeftRight, CircleAlert, CircleCheck, CircleDashed } from 'lucide-react'

import { BitGrid } from '@/components/bit-grid'
import { Reveal } from '@/components/motion'
import { SampleArtwork } from '@/components/sample-artwork'
import { ScoreRing } from '@/components/score-ring'
import { SectionHeading } from '@/components/section-heading'
import { Badge } from '@/components/ui/badge'
import { hammingSimilarity, hexToBits } from '@/lib/hash'
import { SAMPLE } from '@/pages/landing/sample-record'

const EXAMPLE_COSINE = 0.941

const TIERS = [
  {
    icon: CircleCheck,
    tone: 'text-success',
    title: 'Evidence-grade match',
    body: 'Geometry aligns and fingerprints agree. Strong enough to back a takedown request.',
  },
  {
    icon: CircleAlert,
    tone: 'text-warning',
    title: 'Possible match',
    body: 'Similar, but not proven. Flagged for a human to look at, never presented as proof.',
  },
  {
    icon: CircleDashed,
    tone: 'text-muted-foreground',
    title: 'No match',
    body: 'Nothing in the registry is close enough. You see the nearest candidates anyway.',
  },
]

function diffBits(a: string, b: string): Set<number> {
  const y = hexToBits(b)
  return new Set(hexToBits(a).flatMap((bit, i) => (bit !== y[i] ? [i] : [])))
}

export function EvidencePreview() {
  const hamming = hammingSimilarity(SAMPLE.phash, SAMPLE.suspectPhash)
  const changed = diffBits(SAMPLE.phash, SAMPLE.suspectPhash)

  return (
    <section id="evidence" className="relative scroll-mt-20 border-t bg-card/20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:items-end">
          <Reveal>
            <SectionHeading index="02" eyebrow="Evidence" title="We only call it evidence when it is">
              Every check returns a graded verdict with the measurements behind it, side by side with your
              original. A takedown request should never rest on a guess.
            </SectionHeading>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="grid gap-3 sm:grid-cols-3">
              {TIERS.map((t) => (
                <li key={t.title} className="rounded-xl border bg-card p-4">
                  <t.icon className={`size-5 ${t.tone}`} aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold">{t.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-14">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
              <div className="flex items-center gap-2">
                <Badge variant="success">
                  <CircleCheck /> Evidence-grade match
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">example check</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                work <span className="text-foreground/80">{SAMPLE.workId.slice(0, 8)}</span>
              </span>
            </div>

            <div className="grid lg:grid-cols-[1fr_auto_1fr]">
              <Panel title="Registered original" caption={`phash ${SAMPLE.phash}`}>
                <SampleArtwork />
              </Panel>

              <div className="flex items-center justify-center border-y py-6 lg:border-x lg:border-y-0 lg:px-8">
                <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col">
                  <ScoreRing
                    value={hamming.similarity}
                    label="Perceptual hash"
                    detail={`${hamming.distance} / ${hamming.bits} bits differ`}
                    tone="success"
                  />
                  <ArrowLeftRight className="hidden size-4 text-muted-foreground lg:block" aria-hidden="true" />
                  <ScoreRing
                    value={EXAMPLE_COSINE}
                    label="Visual embedding"
                    detail={`cosine ${EXAMPLE_COSINE.toFixed(3)}`}
                    tone="primary"
                  />
                </div>
              </div>

              <Panel title="Suspected copy" caption={`phash ${SAMPLE.suspectPhash}`}>
                <SampleArtwork variant="altered" />
              </Panel>
            </div>

            <div className="flex flex-col gap-4 border-t bg-background/40 px-5 py-4 sm:flex-row sm:items-center">
              <BitGrid hash={SAMPLE.suspectPhash} highlight={changed} className="w-28 shrink-0" />
              <p className="text-sm text-muted-foreground">
                The copy was cropped, tilted and recoloured, yet only{' '}
                <span className="font-mono text-warning">{hamming.distance}</span> of its 64 perceptual-hash bits
                changed. Highlighted cells are the bits that flipped.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Panel({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col gap-3 p-5">
      <figcaption className="flex items-center justify-between text-xs">
        <span className="font-medium">{title}</span>
        <span className="font-mono text-muted-foreground">{caption}</span>
      </figcaption>
      <div className="aspect-[4/3] overflow-hidden rounded-lg border">{children}</div>
    </figure>
  )
}
