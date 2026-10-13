import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { useAuth } from '@/auth/auth-context'
import type { Session } from '@/auth/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api'
import { AuthShell } from '@/pages/auth/auth-shell'
import { FormField, PasswordField } from '@/pages/auth/form-field'
import { SubmitButton } from '@/pages/auth/submit-button'

type LoginLocationState = { from?: string; notice?: string } | null

export function LoginPage() {
  const [identifier, setIdentifier] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const state = useLocation().state as LoginLocationState
  const from = state?.from || '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim() || !password) return
    setError(null)
    setLoading(true)
    try {
      // The backend uses OAuth2's password form: `username` accepts an email or a username.
      const session = await apiClient<Session>('/api/auth/login', {
        method: 'POST',
        form: { username: identifier.trim(), password },
      })
      login(session.access_token, session.user)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your registered work and check suspected copies."
      footer={
        <>
          New to ProvNet?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        {state?.notice && !error && (
          <Alert variant="success" role="status">
            <CheckCircle2 />
            <AlertDescription>{state.notice}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <FormField
          id="identifier"
          label="Email or username"
          autoComplete="username"
          placeholder="you@example.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoFocus
          required
        />
        <PasswordField
          id="password"
          label="Password"
          labelAside={
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
              Forgot password?
            </Link>
          }
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <SubmitButton loading={loading} disabled={!identifier.trim() || !password}>
          Sign in
        </SubmitButton>
      </form>
    </AuthShell>
  )
}
