import * as React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { APP_NAV } from '@/components/app-shell/nav'
import { RegistryStatusCard } from '@/components/app-shell/registry-status'
import { UserMenu } from '@/components/app-shell/user-menu'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="grid gap-1">
      {APP_NAV.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-foreground shadow-[inset_2px_0_0_0_var(--primary)]'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('size-4', isActive && 'text-primary')} aria-hidden="true" />
                {item.label}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** Signed-in layout: sidebar on desktop, top bar with a collapsible menu on small screens. */
export function AppShell() {
  const [open, setOpen] = React.useState(false)
  const { pathname } = useLocation()

  React.useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-card/40 p-4 lg:flex">
        <Brand className="px-2 pt-1" />
        <nav aria-label="App">
          <NavLinks />
        </nav>
        <div className="mt-auto space-y-3">
          <RegistryStatusCard />
          <UserMenu />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Brand />
          <div className="flex items-center gap-1">
            <UserMenu compact />
            <Button
              variant="ghost"
              size="icon"
              aria-expanded={open}
              aria-controls="app-mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.nav
              id="app-mobile-nav"
              aria-label="App"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t px-4"
            >
              <div className="space-y-3 py-3">
                <NavLinks onNavigate={() => setOpen(false)} />
                <RegistryStatusCard />
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main id="main" className="min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
