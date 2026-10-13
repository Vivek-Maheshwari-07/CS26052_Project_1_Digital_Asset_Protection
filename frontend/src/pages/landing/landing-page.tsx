import { ClosingCta } from '@/pages/landing/closing-cta'
import { EvidencePreview } from '@/pages/landing/evidence-preview'
import { Hero } from '@/pages/landing/hero'
import { HowItWorks } from '@/pages/landing/how-it-works'
import { LedgerDemo } from '@/pages/landing/ledger-demo'
import { RecordAnatomy } from '@/pages/landing/record-anatomy'

export function LandingPage() {
  return (
    <>
      <Hero />
      <RecordAnatomy />
      <HowItWorks />
      <EvidencePreview />
      <LedgerDemo />
      <ClosingCta />
    </>
  )
}
