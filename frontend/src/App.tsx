import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/app-layout'
import { NotFoundPage } from '@/pages/not-found'
import { RoutePending } from '@/pages/route-pending'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<RoutePending title="Landing" />} />
        <Route path="login" element={<RoutePending title="Sign in" />} />
        <Route path="signup" element={<RoutePending title="Create an account" />} />
        <Route path="dashboard" element={<RoutePending title="Dashboard" />} />
        <Route path="protect" element={<RoutePending title="Protect an asset" />} />
        <Route path="verify" element={<RoutePending title="Verify a copy" />} />
        <Route path="evidence/:checkId" element={<RoutePending title="Evidence" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
