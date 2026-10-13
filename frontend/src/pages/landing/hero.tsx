import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ScanSearch } from 'lucide-react'

import { EASE_OUT } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { FingerprintConsole } from '@/pages/landing/fingerprint-console'

const SPECS = ['SHA-256', 'pHash · 64-bit', 'CLIP + DINOv2', 'OpenTimestamps']

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
}

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid mask-radial" />
      <div
        aria-hidden="true"
        className="absolute top-[-20%] left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(34_211_238/0.14),transparent)]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-28">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="space-y-7"
        >
          <motion.p
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Registry · Fingerprint · Evidence
          </motion.p>

          <motion.h1
            variants={item}
            className="text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl"
          >
            Prove you made it{' '}
            <span className="bg-gradient-to-r from-primary via-cyan-200 to-success bg-clip-text text-transparent">
              first.
            </span>
          </motion.h1>

          <motion.p variants={item} className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            ProvNet fingerprints every image you register, seals it into a tamper-evident hash chain and anchors
            the record to Bitcoin. When a copy turns up cropped, recompressed or recoloured, you get evidence you
            can act on, not a hunch.
          </motion.p>

          <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/signup">
                Protect an asset <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/verify">
                <ScanSearch /> Verify a copy
              </Link>
            </Button>
          </motion.div>

          <motion.ul variants={item} className="flex flex-wrap gap-x-5 gap-y-2 pt-2" aria-label="What each record contains">
            {SPECS.map((s) => (
              <li key={s} className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="size-1 rounded-full bg-primary/70" aria-hidden="true" />
                {s}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.2 }}
        >
          <FingerprintConsole />
        </motion.div>
      </div>
    </section>
  )
}
