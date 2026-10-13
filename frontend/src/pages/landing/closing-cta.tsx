import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { BrandMark } from '@/components/brand'
import { Reveal } from '@/components/motion'
import { Button } from '@/components/ui/button'

export function ClosingCta() {
  return (
    <section className="px-4 pb-24 sm:px-6 sm:pb-32">
      <Reveal>
        <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-2xl border bg-card px-6 py-16 text-center sm:px-12">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid mask-radial opacity-80" />
          <div
            aria-hidden="true"
            className="absolute bottom-[-60%] left-1/2 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(52_211_153/0.14),transparent)]"
          />
          <BrandMark className="mx-auto size-12" />
          <h2 className="mx-auto mt-6 max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Register your first work in under a minute
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Built for independent illustrators and photographers who today have no simple way to prove who came
            first.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/signup">
                Create a free account <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">I already have one</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
