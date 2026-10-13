import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, MailCheck } from 'lucide-react'

import { useCountdown } from '@/auth/hooks'
import { maskEmail, OTP_LENGTH, passwordValid, validateEmail } from '@/auth/rules'
import type { OtpIssued } from '@/auth/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api'
import { EASE_OUT } from '@/lib/motion'
import { AuthShell } from '@/pages/auth/auth-shell'
import { FormField, PasswordField } from '@/pages/auth/form-field'
import { OtpField } from '@/pages/auth/otp-field'
import { PasswordChecklist } from '@/pages/auth/password-checklist'
import { ResendRow } from '@/pages/auth/resend-row'
import { SubmitButton } from '@/pages/auth/submit-button'

type Step = 'email' | 'reset'

const stepMotion = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.25, ease: EASE_OUT },
}

export function ForgotPasswordPage() {
  const [step, setStep] = React.useState<Step>('email')
  const [email, setEmail] = React.useState('')
  const [code, setCode] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [resendIn, setResendIn] = React.useState(0)
  const [sendKey, setSendKey] = React.useState(0)
  const countdown = useCountdown(resendIn, sendKey)
  const navigate = useNavigate()

  const emailError = email ? validateEmail(email) : null

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault()
    if (validateEmail(email)) return
    setError(null)
    setLoading(true)
    try {
      // The first request goes to /password/forgot; later ones reuse the pending code via /otp/resend.
      const r = await apiClient<OtpIssued>(step === 'email' ? '/api/auth/password/forgot' : '/api/auth/otp/resend', {
        method: 'POST',
        json: step === 'email' ? { email: email.trim() } : { email: email.trim(), purpose: 'reset' },
      })
      setResendIn(r.resend_in)
      setSendKey((k) => k + 1)
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a reset code.')
    } finally {
      setLoading(false)
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== OTP_LENGTH || !passwordValid(password)) return
    setError(null)
    setLoading(true)
    try {
      await apiClient('/api/auth/password/reset', {
        method: 'POST',
        json: { email: email.trim(), code, new_password: password },
      })
      navigate('/login', { replace: true, state: { notice: 'Password updated. Sign in with your new password.' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={step === 'email' ? 'Reset your password' : 'Choose a new password'}
      description={
        step === 'email' ? (
          "Enter the email you signed up with and we'll send you a reset code."
        ) : (
          <>
            If an account exists for <span className="font-mono text-foreground">{maskEmail(email.trim())}</span>, a{' '}
            {OTP_LENGTH}-digit code is on its way.
          </>
        )
      }
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === 'email' ? (
          <motion.form key="email" {...stepMotion} onSubmit={requestCode} noValidate className="grid gap-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FormField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              autoFocus
            />
            <SubmitButton loading={loading} disabled={!email || !!emailError}>
              Send reset code
            </SubmitButton>
          </motion.form>
        ) : (
          <motion.form key="reset" {...stepMotion} onSubmit={reset} noValidate className="grid gap-5">
            {error ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="info" role="status">
                <MailCheck />
                <AlertDescription>Check your inbox and spam folder. The code expires in 10 minutes.</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="reset-code">Reset code</Label>
              <OtpField id="reset-code" value={code} onChange={setCode} invalid={!!error} align="start" />
            </div>
            <div className="grid gap-3">
              <PasswordField
                id="new-password"
                label="New password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="new-password-rules"
              />
              <PasswordChecklist id="new-password-rules" password={password} />
            </div>
            <SubmitButton loading={loading} disabled={code.length !== OTP_LENGTH || !passwordValid(password)}>
              Update password
            </SubmitButton>
            <ResendRow
              countdown={countdown}
              onBack={() => {
                setStep('email')
                setError(null)
              }}
              backLabel="Use another email"
              onResend={() => requestCode()}
            />
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  )
}
