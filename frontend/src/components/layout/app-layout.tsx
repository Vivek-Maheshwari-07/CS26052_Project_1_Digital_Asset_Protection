import * as React from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

/** Scrolls to `#hash` targets after navigation, or to the top on a plain route change. */
function useScrollRestoration() {
  const { pathname, hash } = useLocation()

  React.useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
}

export function AppLayout() {
  useScrollRestoration()

  return (
    <div className="relative flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
