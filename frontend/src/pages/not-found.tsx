import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-32 text-center">
      <span className="font-mono text-sm text-destructive">404 · no record</span>
      <h1 className="text-3xl font-semibold tracking-tight">Nothing is registered at this address</h1>
      <Button asChild>
        <Link to="/">Return home</Link>
      </Button>
    </section>
  )
}
