import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link2, Link2Off, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react'

import { HashText } from '@/components/hash-text'
import { Reveal } from '@/components/motion'
import { SectionHeading } from '@/components/section-heading'
import { Button } from '@/components/ui/button'
import { canonicalJson, sha256Hex } from '@/lib/hash'
import { cn } from '@/lib/utils'

type Entry = { id: string; owner_name: string; title: string; created_at: string }

const ENTRIES: Entry[] = [
  { id: 'a41f09c2', owner_name: 'Mira Okafor', title: 'Harbour at Blue Hour', created_at: '2026-09-02T08:14:00+00:00' },
  { id: '7c9e6679', owner_name: 'Dev Patel', title: 'Mountains at Dusk', created_at: '2026-09-02T09:41:00+00:00' },
  { id: 'e03b5d18', owner_name: 'Lena Sato', title: 'Paper Cranes No. 4', created_at: '2026-09-02T10:05:00+00:00' },
]

const TAMPERED_INDEX = 1
const TAMPERED_TITLE = 'Mountains at Dusk (by someone else)'

type Sealed = Entry & { prev_hash: string; entry_hash: string }
type Checked = Sealed & { recomputed: string; intact: boolean; linked: boolean }

async function seal(entries: Entry[]): Promise<Sealed[]> {
  const out: Sealed[] = []
  let prev = 'GENESIS'
  for (const e of entries) {
    const entry_hash = await sha256Hex(canonicalJson({ ...e, prev_hash: prev }))
    out.push({ ...e, prev_hash: prev, entry_hash })
    prev = entry_hash
  }
  return out
}

function withoutHash({ entry_hash: _ignored, ...rest }: Sealed) {
  return rest
}

/** Recompute every hash; a record fails if its own hash changed or it points at a record that did. */
async function verify(chain: Sealed[]): Promise<Checked[]> {
  const recomputed = await Promise.all(chain.map((rec) => sha256Hex(canonicalJson(withoutHash(rec)))))
  return chain.map((rec, i) => {
    const intact = recomputed[i] === rec.entry_hash
    const linked =
      i === 0
        ? rec.prev_hash === 'GENESIS'
        : rec.prev_hash === chain[i - 1].entry_hash && recomputed[i - 1] === chain[i - 1].entry_hash
    return { ...rec, recomputed: recomputed[i], intact, linked }
  })
}

/**
 * A live three-entry hash chain. Editing the middle record's title changes what its hash
 * recomputes to, so it and every record after it fail verification, exactly as in the registry.
 */
export function LedgerDemo() {
  const [chain, setChain] = React.useState<Sealed[] | null>(null)
  const [checked, setChecked] = React.useState<Checked[] | null>(null)
  const [tampered, setTampered] = React.useState(false)
  const supported = typeof crypto !== 'undefined' && !!crypto.subtle

  React.useEffect(() => {
    if (supported) seal(ENTRIES).then(setChain)
  }, [supported])

  React.useEffect(() => {
    if (!chain) return
    const edited = tampered
      ? chain.map((r, i) => (i === TAMPERED_INDEX ? { ...r, title: TAMPERED_TITLE } : r))
      : chain
    verify(edited).then(setChecked)
  }, [chain, tampered])

  const allValid = checked?.every((c) => c.intact && c.linked)
  const rows: (Partial<Checked> & Entry)[] = checked ?? ENTRIES

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <SectionHeading index="03" eyebrow="Registry" title="Tamper-evident by construction">
              Each entry stores the hash of the one before it. Try rewriting history: change who owns the middle
              record and watch the chain refuse it.
            </SectionHeading>
          </Reveal>
          <Reveal delay={0.1} className="flex shrink-0 items-center gap-3">
            <Button
              variant="outline"
              className={cn(!tampered && 'border-destructive/40 text-destructive hover:border-destructive/70 hover:text-destructive')}
              onClick={() => setTampered((t) => !t)}
              disabled={!checked}
              aria-pressed={tampered}
            >
              {tampered ? (
                <>
                  <RotateCcw /> Restore record
                </>
              ) : (
                <>
                  <ShieldAlert /> Tamper with entry #2
                </>
              )}
            </Button>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-12">
          <div
            className={cn(
              'mb-4 flex items-center gap-2 font-mono text-xs transition-colors',
              allValid ? 'text-success' : 'text-destructive',
            )}
            role="status"
            aria-live="polite"
          >
            {!supported
              ? 'Live hashing needs a secure (https) context.'
              : !checked
                ? 'computing hashes…'
                : allValid
                  ? '✓ verify_chain(): all 3 entries intact'
                  : '✗ verify_chain(): integrity failure from entry #2 onward'}
          </div>

          <ol className="grid gap-4 lg:grid-cols-3">
            {rows.map((rec, i) => (
              <li key={rec.id} className="relative">
                {i > 0 && <ChainLink broken={checked ? !rec.linked : false} />}
                <Block index={i} record={rec} ready={!!checked} />
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}

function Block({ index, record, ready }: { index: number; record: Partial<Checked> & Entry; ready: boolean }) {
  const ok = ready && record.intact && record.linked
  const bad = ready && !ok

  return (
    <motion.article
      layout
      className={cn(
        'flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition-[border-color,box-shadow] duration-500',
        ok && 'border-success/25',
        bad && 'border-destructive/50 shadow-[0_0_32px_-12px_rgb(244_63_94/0.6)]',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">entry #{index + 1}</span>
        {ready &&
          (ok ? (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <ShieldCheck className="size-3.5" /> intact
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-destructive">
              <ShieldAlert className="size-3.5" /> {record.intact ? 'broken link' : 'hash mismatch'}
            </span>
          ))}
      </div>

      <div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h3
            key={record.title}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={cn('font-semibold tracking-tight', bad && !record.intact && 'text-destructive')}
          >
            {record.title}
          </motion.h3>
        </AnimatePresence>
        <p className="text-sm text-muted-foreground">{record.owner_name}</p>
      </div>

      <dl className="mt-auto space-y-1.5 rounded-lg border bg-background/50 p-3 text-xs">
        <Field label="prev_hash">
          {record.prev_hash ? (
            record.prev_hash === 'GENESIS' ? (
              <span className="font-mono text-[0.8125rem] text-muted-foreground">GENESIS</span>
            ) : (
              <HashText value={record.prev_hash} truncate={8} label="previous hash" className="text-muted-foreground" />
            )
          ) : (
            <Pending />
          )}
        </Field>
        <Field label="entry_hash">
          {record.entry_hash ? <HashText value={record.entry_hash} truncate={8} label="stored entry hash" /> : <Pending />}
        </Field>
        <Field label="recomputed">
          {record.recomputed ? (
            <HashText
              value={record.recomputed}
              truncate={8}
              label="recomputed hash"
              className={record.intact ? 'text-success' : 'text-destructive'}
            />
          ) : (
            <Pending />
          )}
        </Field>
      </dl>
    </motion.article>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-2">
      <dt className="font-mono text-[11px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

function Pending() {
  return <span className="block h-3 w-32 animate-pulse rounded bg-muted" />
}

function ChainLink({ broken }: { broken: boolean }) {
  const Icon = broken ? Link2Off : Link2
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute z-10 flex size-7 items-center justify-center rounded-full border bg-background transition-colors',
        'top-[-22px] left-1/2 -translate-x-1/2 lg:top-1/2 lg:left-[-22px] lg:translate-x-0 lg:-translate-y-1/2',
        broken ? 'border-destructive/60 text-destructive' : 'border-success/40 text-success',
      )}
    >
      <Icon className="size-3.5 rotate-90 lg:rotate-0" />
    </span>
  )
}
