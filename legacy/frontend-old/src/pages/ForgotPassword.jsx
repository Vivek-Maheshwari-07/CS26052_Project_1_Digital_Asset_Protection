import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import AuthLayout from '../components/AuthLayout';
import { useToast } from '../components/Toast';
import {
    Field, PasswordField, PasswordStrength, OtpInput, SubmitButton,
    passwordValid, useCountdown, maskEmail,
} from '../components/FormControls';
import { IconMail, IconLock, IconAlert, IconArrowLeft } from '../components/Icons';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

export default function ForgotPassword() {
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const [sendKey, setSendKey] = useState(0);
    const countdown = useCountdown(resendIn, sendKey);
    const navigate = useNavigate();
    const toast = useToast();

    const requestCode = async (e) => {
        e?.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const endpoint = step === 'email' ? '/api/auth/password/forgot' : '/api/auth/otp/resend';
            const r = await apiClient(endpoint, {
                method: 'POST',
                json: step === 'email' ? { email: email.trim() } : { email: email.trim(), purpose: 'reset' },
            });
            setResendIn(r.resend_in);
            setSendKey((k) => k + 1);
            setStep('reset');
            if (r.sent) toast('If an account exists for that email, a code is on its way');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const reset = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await apiClient('/api/auth/password/reset', {
                method: 'POST',
                json: { email: email.trim(), code, new_password: password },
            });
            toast('Password updated. Log in with your new password.');
            navigate('/login', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Link to="/login" className="back-link"><IconArrowLeft size={15} /> Back to log in</Link>

            {step === 'email' ? (
                <div className="step-enter" key="email">
                    <div className="auth-head">
                        <h2>Reset your password</h2>
                        <p>Enter the email you signed up with and we'll send you a reset code.</p>
                    </div>
                    <form onSubmit={requestCode} noValidate>
                        {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
                        <Field id="email" label="Email" icon={IconMail} type="email" autoComplete="email"
                            placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                        <SubmitButton loading={loading} disabled={!EMAIL_RE.test(email.trim())}>Send reset code</SubmitButton>
                    </form>
                </div>
            ) : (
                <div className="step-enter" key="reset">
                    <div className="auth-head">
                        <h2>Choose a new password</h2>
                        <p>Enter the code we sent to <strong>{maskEmail(email.trim())}</strong> and pick a new password.</p>
                    </div>
                    <form onSubmit={reset} noValidate>
                        {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
                        <label className="field-label">Verification code</label>
                        <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} disabled={loading} invalid={!!error} />
                        <div className="resend-row">
                            {countdown > 0
                                ? <span className="muted">Resend code in 0:{String(countdown).padStart(2, '0')}</span>
                                : <button type="button" className="link-btn strong" onClick={requestCode}>Resend code</button>}
                        </div>
                        <PasswordField id="new-password" label="New password" icon={IconLock} autoComplete="new-password"
                            placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <PasswordStrength password={password} />
                        <SubmitButton loading={loading} disabled={code.length !== 6 || !passwordValid(password)}>
                            Update password
                        </SubmitButton>
                    </form>
                </div>
            )}
        </AuthLayout>
    );
}
