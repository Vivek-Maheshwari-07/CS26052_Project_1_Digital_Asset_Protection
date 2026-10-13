import { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { apiClient } from '../api/client';
import AuthLayout from '../components/AuthLayout';
import { Field, PasswordField, SubmitButton } from '../components/FormControls';
import { IconUser, IconLock, IconAlert } from '../components/Icons';

export default function Login() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(0);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await apiClient('/api/auth/login', {
                method: 'POST',
                form: { username: identifier.trim(), password },
            });
            login(data.access_token, data.user);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
            setShake((s) => s + 1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-head">
                <h2>Welcome back</h2>
                <p>Log in to manage and protect your registered work.</p>
            </div>

            <form onSubmit={handleSubmit} key={shake} className={shake ? 'shake' : ''} noValidate>
                {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
                <Field
                    id="identifier"
                    label="Email or username"
                    icon={IconUser}
                    autoComplete="username"
                    placeholder="you@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoFocus
                    required
                />
                <PasswordField
                    id="password"
                    label={<span className="label-row">Password <Link to="/forgot-password" className="link-subtle">Forgot password?</Link></span>}
                    icon={IconLock}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <SubmitButton loading={loading} disabled={!identifier.trim() || !password}>Log in</SubmitButton>
            </form>

            <p className="auth-switch">
                New to Provenance? <Link to="/signup">Create an account</Link>
            </p>
        </AuthLayout>
    );
}
