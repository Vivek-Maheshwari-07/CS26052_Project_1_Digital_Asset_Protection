import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { apiClient } from '../api/client';
import AuthLayout from '../components/AuthLayout';
import { useToast } from '../components/Toast';
import {
    Field, PasswordField, PasswordStrength, OtpInput, SubmitButton,
    passwordValid, useCountdown, maskEmail,
} from '../components/FormControls';
import { IconUser, IconAt, IconMail, IconLock, IconAlert, IconArrowLeft, IconCheck } from '../components/Icons';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/;

const validators = {
    full_name: (v) => (v.trim().length >= 2 ? null : 'Enter your full name'),
    username: (v) => (USERNAME_RE.test(v.trim()) ? null : '3–30 characters: letters, numbers, _ or .'),
    email: (v) => (EMAIL_RE.test(v.trim()) ? null : 'Enter a valid email address'),
    password: (v) => (passwordValid(v) ? null : 'Password doesn’t meet the requirements'),
};

/** Debounced server-side check that a username/email isn't already registered. */
function useAvailability(field, value, valid) {
    const [state, setState] = useState({ status: null });
    useEffect(() => {
        if (!valid) { setState({ status: null }); return; }
        let cancelled = false;
        setState({ status: 'checking' });
        const t = setTimeout(async () => {
            try {
                const r = await apiClient(`/api/auth/availability?${field}=${encodeURIComponent(value.trim())}`);
                if (cancelled) return;
                const info = r[field];
                setState(info.available
                    ? { status: 'ok' }
                    : { status: 'bad', reason: info.reason || (field === 'email'
                        ? 'An account with this email already exists'
                        : 'That username is taken') });
            } catch {
                // Couldn't verify (e.g. server unreachable): don't block; /signup/start re-checks.
                if (!cancelled) setState({ status: 'unknown' });
            }
        }, 450);
        return () => { cancelled = true; clearTimeout(t); };
    }, [field, value, valid]);
    return state;
}

function Stepper({ step }) {
    const steps = ['Your details', 'Verify email', 'Done'];
    const idx = { details: 0, verify: 1, done: 2 }[step];
    return (
        <ol className="stepper">
            {steps.map((label, i) => (
                <li key={label} className={i < idx ? 'complete' : i === idx ? 'current' : ''}>
                    <span className="stepper-dot">{i < idx ? <IconCheck size={12} /> : i + 1}</span>
                    <span className="stepper-label">{label}</span>
                </li>
            ))}
        </ol>
    );
}

export default function Signup() {
    const [step, setStep] = useState('details');
    const [form, setForm] = useState({ full_name: '', username: '', email: '', password: '' });
    const [touched, setTouched] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const [sendKey, setSendKey] = useState(0);
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState(null);
    const [session, setSession] = useState(null);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const toast = useToast();
    const countdown = useCountdown(resendIn, sendKey);

    const errors = Object.fromEntries(Object.entries(validators).map(([k, fn]) => [k, fn(form[k])]));
    const usernameAvail = useAvailability('username', form.username, !errors.username);
    const emailAvail = useAvailability('email', form.email, !errors.email);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const touch = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
    const fieldError = (k, avail) =>
        (touched[k] && form[k] && errors[k]) || (avail?.status === 'bad' ? avail.reason : null);

    const canSubmit = !Object.values(errors).some(Boolean)
        && ![usernameAvail.status, emailAvail.status].some((st) => st === 'bad' || st === 'checking');

    const startSignup = async (e) => {
        e.preventDefault();
        setTouched({ full_name: true, username: true, email: true, password: true });
        if (!canSubmit) return;
        setError(null);
        setLoading(true);
        try {
            const r = await apiClient('/api/auth/signup/start', {
                method: 'POST',
                json: { ...form, email: form.email.trim(), username: form.username.trim() },
            });
            setResendIn(r.resend_in);
            setSendKey((k) => k + 1);
            setCode('');
            setCodeError(null);
            setStep('verify');
            if (r.sent) toast(`Verification code sent to ${maskEmail(r.email)}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const verify = async (value = code) => {
        if (value.length !== 6 || loading) return;
        setCodeError(null);
        setLoading(true);
        try {
            const data = await apiClient('/api/auth/signup/verify', {
                method: 'POST',
                json: { email: form.email.trim(), code: value },
            });
            setSession(data);
            setStep('done');
        } catch (err) {
            setCodeError(err.message);
            setCode('');
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        setCodeError(null);
        try {
            const r = await apiClient('/api/auth/otp/resend', {
                method: 'POST',
                json: { email: form.email.trim(), purpose: 'signup' },
            });
            setResendIn(r.resend_in);
            setSendKey((k) => k + 1);
            if (r.sent) toast('A new code is on its way');
        } catch (err) {
            setCodeError(err.message);
        }
    };

    // Brief success moment, then into the app.
    useEffect(() => {
        if (step !== 'done' || !session) return;
        const t = setTimeout(() => {
            login(session.access_token, session.user);
            navigate('/dashboard', { replace: true });
        }, 1600);
        return () => clearTimeout(t);
    }, [step, session, login, navigate]);

    return (
        <AuthLayout>
            <Stepper step={step} />

            {step === 'details' && (
                <div className="step-enter" key="details">
                    <div className="auth-head">
                        <h2>Create your account</h2>
                        <p>Start building a verifiable record of your creative work.</p>
                    </div>
                    <form onSubmit={startSignup} noValidate>
                        {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
                        <Field id="full_name" label="Full name" icon={IconUser} autoComplete="name"
                            placeholder="Ada Lovelace" value={form.full_name} onChange={set('full_name')}
                            onBlur={touch('full_name')} error={fieldError('full_name')} autoFocus />
                        <div className="field-row">
                            <Field id="username" label="Username" icon={IconAt} autoComplete="username"
                                placeholder="ada.draws" value={form.username} onChange={set('username')}
                                onBlur={touch('username')} status={form.username && !errors.username ? usernameAvail.status : null}
                                error={fieldError('username', usernameAvail)} />
                            <Field id="email" label="Email" icon={IconMail} type="email" autoComplete="email"
                                placeholder="you@example.com" value={form.email} onChange={set('email')}
                                onBlur={touch('email')} status={form.email && !errors.email ? emailAvail.status : null}
                                error={fieldError('email', emailAvail)} />
                        </div>
                        <PasswordField id="password" label="Password" icon={IconLock} autoComplete="new-password"
                            placeholder="Create a strong password" value={form.password} onChange={set('password')}
                            onBlur={touch('password')} />
                        <PasswordStrength password={form.password} />
                        <SubmitButton loading={loading} disabled={!canSubmit}>Continue</SubmitButton>
                    </form>
                    <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
                </div>
            )}

            {step === 'verify' && (
                <div className="step-enter" key="verify">
                    <div className="verify-icon"><IconMail size={26} /></div>
                    <div className="auth-head center">
                        <h2>Check your inbox</h2>
                        <p>We sent a 6-digit code to <strong>{maskEmail(form.email.trim())}</strong>. It expires in 10 minutes.</p>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); verify(); }} noValidate>
                        <OtpInput value={code} onChange={(v) => { setCode(v); setCodeError(null); }}
                            onComplete={verify} disabled={loading} invalid={!!codeError} />
                        {codeError && <p className="otp-error"><IconAlert size={15} /> {codeError}</p>}
                        <SubmitButton loading={loading} disabled={code.length !== 6}>Verify & create account</SubmitButton>
                    </form>
                    <div className="verify-actions">
                        <button type="button" className="link-btn" onClick={() => setStep('details')}>
                            <IconArrowLeft size={15} /> Change details
                        </button>
                        {countdown > 0
                            ? <span className="muted">Resend code in 0:{String(countdown).padStart(2, '0')}</span>
                            : <button type="button" className="link-btn strong" onClick={resend}>Resend code</button>}
                    </div>
                </div>
            )}

            {step === 'done' && (
                <div className="step-enter success-state" key="done">
                    <div className="success-ring"><IconCheck size={34} /></div>
                    <h2>You're all set, {form.full_name.trim().split(' ')[0]}!</h2>
                    <p>Your email is verified. Taking you to your portfolio…</p>
                </div>
            )}
        </AuthLayout>
    );
}
