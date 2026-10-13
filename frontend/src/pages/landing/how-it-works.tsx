import { FileBadge, Fingerprint, Link2, UploadCloud } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Reveal } from '@/components/motion'
import { SectionHeading } from '@/components/section-heading'

type Step = { icon: LucideIcon; title: string; body: string; artefact: string }

const STEPS: Step[] = [
  {
    icon: UploadCloud,
    title: 'Upload your original',
    body: 'Drop in a JPEG, PNG or WebP. Near-duplicates of works already registered are flagged before anything is saved.',
    artefact: 'image/png · 2048×1536',
  },
  {
    icon: Fingerprint,
    title: 'Fingerprint it',
    body: 'We compute an exact digest, a perceptual hash and deep visual embeddings of the image.',
    artefact: 'phash c3a1f0e8963c5a1d',
  },
  {
    icon: Link2,
    title: 'Seal it on the chain',
    body: "Each record includes the previous record's hash, so editing any entry breaks every one after it.",
    artefact: 'prev_hash → entry_hash',
  },
  {
    icon: FileBadge,
    title: 'Get your certificate',
    body: 'Download a PDF certificate with a QR verification link, plus the raw record and its Bitcoin timestamp proof.',
    artefact: 'certificate.pdf · record.json · proof.ots',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading index="01" eyebrow="Process" title="From upload to proof in four steps">
            Registration takes under a minute. What you get back is a record that can be checked by anyone,
            without trusting us.
          </SectionHeading>
        </Reveal>

        <ol className="relative mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div
            aria-hidden="true"
            className="absolute top-[38px] right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block"
          />
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08} className="h-full">
              <li className="group relative flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/30">
                <div className="flex items-center justify-between">
                  <span className="relative flex size-11 items-center justify-center rounded-lg border bg-background text-primary transition-shadow group-hover:shadow-[0_0_24px_-4px_var(--glow-cyan)]">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold tracking-tight">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
                <code className="mt-auto truncate rounded-md border bg-background/60 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
                  {step.artefact}
                </code>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
