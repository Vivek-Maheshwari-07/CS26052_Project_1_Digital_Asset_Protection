import { useEffect, useRef, useState } from 'react';
import { IconEye, IconEyeOff, IconCheck, IconClose } from './Icons';

/** Text input with a leading icon and an optional trailing status (checking / ok / error). */
export function Field({ label, icon: Ico, status, hint, error, prefix, trailing, ...inputProps }) {
  return (
    <div className={`field ${error ? 'field-error' : ''} ${status === 'ok' ? 'field-ok' : ''}`}>
      {label && <label htmlFor={inputProps.id}>{label}</label>}
      <div className="field-control">
        {Ico && <span className="field-icon"><Ico /></span>}
        {prefix && <span className="field-prefix">{prefix}</span>}
        <input {...inputProps} aria-invalid={!!error} />
        {status === 'checking' && <span className="field-status"><span className="spinner spinner-sm" /></span>}
        {status === 'ok' && <span className="field-status ok"><IconCheck /></span>}
        {status === 'bad' && <span className="field-status bad"><IconClose /></span>}
        {trailing}
      </div>
      {(error || hint) && <p className={error ? 'field-msg error' : 'field-msg'}>{error || hint}</p>}
    </div>
  );
}

export function PasswordField(props) {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      type={show ? 'text' : 'password'}
      trailing={
        <button type="button" className="field-toggle" onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      }
    />
  );
}

export const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: '8+ characters' },
  { test: (p) => /[A-Za-z]/.test(p), label: 'A letter' },
  { test: (p) => /\d/.test(p), label: 'A number' },
];

export const passwordValid = (p) => PASSWORD_RULES.every((r) => r.test(p)) && new TextEncoder().encode(p).length <= 72;

const scorePassword = (p) => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, Math.max(1, s - (passwordValid(p) ? 0 : 1)));
};

const STRENGTH = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export function PasswordStrength({ password }) {
  const score = scorePassword(password);
  return (
    <div className="pw-strength" data-score={score}>
      <div className="pw-bars">{[1, 2, 3, 4].map((i) => <span key={i} className={i <= score ? 'on' : ''} />)}</div>
      <div className="pw-meta">
        <ul>
          {PASSWORD_RULES.map((r) => (
            <li key={r.label} className={r.test(password) ? 'met' : ''}>
              <IconCheck size={13} /> {r.label}
            </li>
          ))}
        </ul>
        {password && <span className="pw-label">{STRENGTH[score]}</span>}
      </div>
    </div>
  );
}

/** Segmented one-time-code input with auto-advance, backspace and paste support. */
export function OtpInput({ length = 6, value, onChange, onComplete, disabled, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setAt = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (joined.length === length && !next.includes('')) onComplete?.(joined);
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    if (raw.length > 1) return handlePaste(i, raw);
    setAt(i, raw);
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (start, text) => {
    const chars = text.replace(/\D/g, '').slice(0, length - start).split('');
    const next = digits.slice();
    chars.forEach((c, k) => { next[start + k] = c; });
    const joined = next.join('');
    onChange(joined);
    refs.current[Math.min(start + chars.length, length - 1)]?.focus();
    if (joined.length === length && !next.includes('')) onComplete?.(joined);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) setAt(i, '');
      else if (i > 0) { refs.current[i - 1]?.focus(); setAt(i - 1, ''); }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className={`otp ${invalid ? 'otp-invalid' : ''}`}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          className={d ? 'filled' : ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => { e.preventDefault(); handlePaste(i, e.clipboardData.getData('text')); }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

/** Counts down from `seconds`; returns remaining seconds. Restart by changing `key`. */
export function useCountdown(seconds, key) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    if (!seconds) return;
    const id = setInterval(() => setLeft((s) => (s <= 1 ? (clearInterval(id), 0) : s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds, key]);
  return left;
}

export const maskEmail = (email) => {
  const [u, d] = email.split('@');
  if (!d) return email;
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, u.length - 2))}@${d}`;
};

export function SubmitButton({ loading, disabled, children, ...props }) {
  return (
    <button className="btn btn-primary btn-block" {...props} disabled={loading || disabled}>
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}
