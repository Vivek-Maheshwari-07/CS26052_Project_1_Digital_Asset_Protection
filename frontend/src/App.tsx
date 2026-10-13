import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/auth/auth-context'
import { GuestRoute, ProtectedRoute } from '@/auth/route-guards'
import { AppLayout } from '@/components/layout/app-layout'
import LegacyFrame from '@/legacy/LegacyFrame'
import { LandingPage } from '@/pages/landing/landing-page'
import { NotFoundPage } from '@/pages/not-found'

// Screens still on the original design load on demand, so the landing page stays light.
const Check = lazy(() => import('@/legacy/pages/Check'))
const Dashboard = lazy(() => import('@/legacy/pages/Dashboard'))
const Evidence = lazy(() => import('@/legacy/pages/Evidence'))
const ForgotPassword = lazy(() => import('@/legacy/pages/ForgotPassword'))
const Login = lazy(() => import('@/legacy/pages/Login'))
const Register = lazy(() => import('@/legacy/pages/Register'))
const Signup = lazy(() => import('@/legacy/pages/Signup'))
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
          <Route element={<LegacyFrame />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<LegacyFrame shell />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="works/new" element={<Register />} />
            <Route path="check" element={<Check />} />
            <Route path="check/:checkId" element={<Check />} />
            <Route path="evidence/:checkId/:matchWorkId" element={<Evidence />} />
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
