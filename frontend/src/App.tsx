import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/auth/auth-context'
import { GuestRoute, ProtectedRoute } from '@/auth/route-guards'
import { AppLayout } from '@/components/layout/app-layout'
import LegacyFrame from '@/legacy/LegacyFrame'
import { LandingPage } from '@/pages/landing/landing-page'
import { NotFoundPage } from '@/pages/not-found'

// Everything except the landing page loads on demand, so the first visit stays light.
const LoginPage = lazy(() => import('@/pages/auth/login-page').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/pages/auth/signup-page').then((m) => ({ default: m.SignupPage })))
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/forgot-password-page').then((m) => ({ default: m.ForgotPasswordPage })),
)

const AppShell = lazy(() => import('@/components/app-shell/app-shell').then((m) => ({ default: m.AppShell })))
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })))

// Screens still on the original design.
const Check = lazy(() => import('@/legacy/pages/Check'))
const Evidence = lazy(() => import('@/legacy/pages/Evidence'))
const Register = lazy(() => import('@/legacy/pages/Register'))
const Verify = lazy(() => import('@/legacy/pages/Verify'))

export function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<GuestRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route element={<LegacyFrame contained />}>
              <Route path="works/new" element={<Register />} />
              <Route path="check" element={<Check />} />
              <Route path="check/:checkId" element={<Check />} />
              <Route path="evidence/:checkId/:matchWorkId" element={<Evidence />} />
            </Route>
          </Route>
        </Route>

        <Route element={<LegacyFrame />}>
          <Route path="verify/:workId" element={<Verify />} />
        </Route>
        <Route path="register" element={<Navigate to="/works/new" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
