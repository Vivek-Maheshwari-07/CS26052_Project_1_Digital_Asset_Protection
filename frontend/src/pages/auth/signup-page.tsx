import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, MailCheck } from 'lucide-react'

import { useAuth } from '@/auth/auth-context'
import { useAvailability, useCountdown } from '@/auth/hooks'
import {
  maskEmail,
  OTP_LENGTH,
  passwordValid,
  validateEmail,
  validateFullName,
  validateUsername,
} from '@/auth/rules'
import type { OtpIssued, Session } from '@/auth/types'
import { HashText } from '@/components/hash-text'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api'
import { EASE_OUT } from '@/lib/motion'
import { AuthShell } from '@/pages/auth/auth-shell'
import { AvailabilityIcon, FormField, PasswordField } from '@/pages/auth/form-field'
import { OtpField } from '@/pages/auth/otp-field'
import { PasswordChecklist } from '@/pages/auth/password-checklist'
import { ResendRow } from '@/pages/auth/resend-row'
import { Stepper } from '@/pages/auth/stepper'
import { SubmitButton } from '@/pages/auth/submit-button'

type Step = 'details' | 'verify' | 'done'
type Form = { full_name: string; username: string; email: string; password: string }

const STEPS = ['Your details', 'Verify email', 'Done']
const STEP_INDEX: Record<Step, number> = { details: 0, verify: 1, done: 2 }
const REDIRECT_DELAY_MS = 1600

const stepMotion = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.25, ease: EASE_OUT },
}

export function SignupPage() {
  const [step, setStep] = React.useState<Step>('details')
  const [form, setForm] = React.useState<Form>({ full_name: '', username: '', email: '', password: '' })
  const [touched, setTouched] = React.useState<Partial<Record<keyof Form, boolean>>>({})
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [codeError, setCodeError] = React.useState<string | null>(null)
  const [resendIn, setResendIn] = React.useState(0)
  const [sendKey, setSendKey] = React.useState(0)
  const [session, setSession] = React.useState<Session | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()
  const countdown = useCountdown(resendIn, sendKey)

  const errors = {
    full_name: validateFullName(form.full_name),
    username: validateUsername(form.username),
    email: validateEmail(form.email),
    password: passwordValid(form.password) ? null : 'Password does not meet the requirements',
  }
  const usernameAvail = useAvailability('username', form.username, !errors.username)
  const emailAvail = useAvailability('email', form.email, !errors.email)
  const email = form.email.trim()

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const touch = (k: keyof Form) => () => setTouched((t) => ({ ...t, [k]: true }))
  const fieldError = (k: keyof Form) => (touched[k] && form[k] ? errors[k] : null)

  const blocked = [usernameAvail.status, emailAvail.status].some((s) => s === 'taken' || s === 'checking')
  const canSubmit = !Object.values(errors).some(Boolean) && !blocked

  function codeIssued(r: OtpIssued, sentMessage: string) {
    setResendIn(r.resend_in)
    setSendKey((k) => k + 1)
    // `sent: false` means the previous code is still valid and inside its resend cooldown.
    setNotice(r.sent ? sentMessage : `Your earlier code to ${maskEmail(r.email)} is still valid.`)
  }

  async function startSignup(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ full_name: true, username: true, email: true, password: true })
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      const r = await apiClient<OtpIssued>('/api/auth/signup/start', {
        method: 'POST',
        json: { ...form, email, username: form.username.trim() },
      })
      codeIssued(r, `We sent a ${OTP_LENGTH}-digit code to ${maskEmail(r.email)}.`)
      setCode('')
      setCodeError(null)
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sign-up.')
    } finally {
      setLoading(false)
    }
  }

  async function verify(value = code) {
    if (value.length !== OTP_LENGTH || loading) return
    setCodeError(null)
    setLoading(true)
    try {
      const data = await apiClient<Session>('/api/auth/signup/verify', {
        method: 'POST',
        json: { email, code: value },
      })
      setSession(data)
      setStep('done')
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Verification failed.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setCodeError(null)
    try {
      const r = await apiClient<OtpIssued>('/api/auth/otp/resend', {
        method: 'POST',
        json: { email, purpose: 'signup' },
      })
      codeIssued(r, 'A new code is on its way.')
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Could not resend the code.')
    }
  }

  // A short success moment, then into the app.
  React.useEffect(() => {
    if (step !== 'done' || !session) return
    const t = window.setTimeout(() => {
      login(session.access_token, session.user)
      navigate('/dashboard', { replace: true })
    }, REDIRECT_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [step, session, login, navigate])

  const copy = {
    details: {
      title: 'Create your account',
      description: 'Start a verifiable record of your creative work.',
    },
    verify: {
      title: 'Check your inbox',
      description: (
        <>
          Enter the {OTP_LENGTH}-digit code sent to <span className="font-mono text-foreground">{maskEmail(email)}</span>.
          It expires in 10 minutes.
        </>
      ),
    },
    done: {
      title: `You're in, ${form.full_name.trim().split(' ')[0]}`,
      description: 'Your email is verified. Opening your dashboard…',
    },
  }[step]

  return (
    <AuthShell
      eyebrow={<Stepper steps={STEPS} current={STEP_INDEX[step]} />}
      title={copy.title}
      description={copy.description}
      footer={
        step === 'details' && (
          <>
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === 'details' && (
          <motion.form key="details" {...stepMotion} onSubmit={startSignup} noValidate className="grid gap-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FormField
              id="full_name"
              label="Full name"
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={form.full_name}
              onChange={set('full_name')}
              onBlur={touch('full_name')}
              error={fieldError('full_name')}
              autoFocus
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="username"
                label="Username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="ada.draws"
                className="font-mono"
                value={form.username}
                onChange={set('username')}
                onBlur={touch('username')}
                error={fieldError('username') ?? (usernameAvail.status === 'taken' ? usernameAvail.reason : null)}
                trailing={<AvailabilityIcon state={usernameAvail} />}
              />
              <FormField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                onBlur={touch('email')}
                error={fieldError('email') ?? (emailAvail.status === 'taken' ? emailAvail.reason : null)}
                trailing={<AvailabilityIcon state={emailAvail} />}
              />
            </div>
            <div className="grid gap-3">
              <PasswordField
                id="password"
                label="Password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={set('password')}
                onBlur={touch('password')}
                aria-describedby="password-rules"
              />
              <PasswordChecklist id="password-rules" password={form.password} />
            </div>
            <SubmitButton loading={loading} disabled={!canSubmit}>
              Continue
            </SubmitButton>
          </motion.form>
        )}

        {step === 'verify' && (
          <motion.form
            key="verify"
            {...stepMotion}
            onSubmit={(e) => {
              e.preventDefault()
              verify()
            }}
            noValidate
            className="grid gap-6"
          >
            {notice && (
              <Alert variant="info" role="status">
                <MailCheck />
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
            <OtpField
              value={code}
              onChange={(v) => {
                setCode(v)
                setCodeError(null)
              }}
              onComplete={verify}
              invalid={!!codeError}
              describedBy={codeError ? 'code-error' : undefined}
            />
            {codeError && (
              <p id="code-error" role="alert" className="-mt-2 text-center text-sm text-destructive">
                {codeError}
              </p>
            )}
            <SubmitButton loading={loading} disabled={code.length !== OTP_LENGTH}>
              Verify and create account
            </SubmitButton>
            <ResendRow
              countdown={countdown}
              onBack={() => setStep('details')}
              backLabel="Change details"
              onResend={resend}
            />
          </motion.form>
        )}

        {step === 'done' && (
          <motion.div key="done" {...stepMotion} className="grid gap-4" role="status">
            <div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/[0.06] p-4">
              <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden="true" />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">Account created</p>
                {session && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    User ID <HashText value={session.user.id} truncate={6} label="user ID" />
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  )
}
