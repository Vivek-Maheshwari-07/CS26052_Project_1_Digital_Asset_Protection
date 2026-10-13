import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/auth/auth-context'
import { BrandMark } from '@/components/brand'

function SessionCheck() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Checking your session">
      <BrandMark className="size-10 animate-pulse" />
    </div>
  )
}

/** Only for signed-in users; everyone else is sent to /login and returned afterwards. */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SessionCheck />
  if (status !== 'authed') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Only for signed-out users; a signed-in visitor goes straight to the dashboard. */
export function GuestRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <SessionCheck />
  if (status === 'authed') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
