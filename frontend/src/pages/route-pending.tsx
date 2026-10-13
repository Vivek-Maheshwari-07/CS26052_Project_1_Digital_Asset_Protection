import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** Holds a route's place in the router until its page is built. */
export function RoutePending({ title }: { title: string }) {
  const { pathname } = useLocation()

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-32 text-center">
      <span className="font-mono text-xs text-primary">{pathname}</span>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">This screen is next in the rebuild.</p>
      <Button variant="outline" asChild>
        <Link to="/">
          <ArrowLeft /> Back to home
        </Link>
      </Button>
    </section>
  )
}
