import { Reveal } from '@/components/motion'

const FIELDS = [
  { value: 'SHA-256', label: 'Exact-file digest', note: 'Proves this byte-for-byte file existed.' },
  { value: '64-bit', label: 'Perceptual hash', note: 'Survives resizing, recompression and light edits.' },
  { value: '512-d', label: 'Visual embedding', note: 'Recognises crops, colour filters and screenshots.' },
  { value: 'BTC', label: 'Anchored timestamp', note: 'OpenTimestamps proof nobody can backdate.' },
]

export function RecordAnatomy() {
  return (
    <section aria-labelledby="anatomy-title" className="border-y bg-card/30">
      <h2 id="anatomy-title" className="sr-only">
        What every registration records
      </h2>
      <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-border px-4 sm:px-6 lg:grid-cols-4 lg:divide-x">
        {FIELDS.map((f, i) => (
          <Reveal key={f.label} delay={i * 0.06} className="space-y-1.5 px-2 py-8 lg:px-6">
            <dt className="text-sm font-medium">{f.label}</dt>
            <dd className="font-mono text-2xl font-semibold tracking-tight text-primary">{f.value}</dd>
            <dd className="text-sm text-muted-foreground">{f.note}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  )
}
