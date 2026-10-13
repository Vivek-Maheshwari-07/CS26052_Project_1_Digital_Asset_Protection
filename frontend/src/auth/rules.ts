/**
 * Client-side mirrors of the backend validators in backend/app/api/auth.py, so users see
 * problems before submitting. The server stays the source of truth and re-validates.
 */
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/
export const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/
export const OTP_LENGTH = 6

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'letter', label: 'A letter', test: (p: string) => /[A-Za-z]/.test(p) },
  { id: 'number', label: 'A number', test: (p: string) => /\d/.test(p) },
] as const

/** bcrypt only reads the first 72 bytes, so the backend rejects anything longer. */
export function passwordTooLong(p: string): boolean {
  return new TextEncoder().encode(p).length > 72
}

export function passwordValid(p: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(p)) && !passwordTooLong(p)
}

export function validateFullName(v: string): string | null {
  const n = v.trim().replace(/\s+/g, ' ').length
  return n >= 2 && n <= 80 ? null : 'Enter your full name (2–80 characters)'
}

export function validateUsername(v: string): string | null {
  return USERNAME_RE.test(v.trim()) ? null : '3–30 characters: letters, numbers, _ or .'
}

export function validateEmail(v: string): string | null {
  return EMAIL_RE.test(v.trim()) ? null : 'Enter a valid email address'
}

/** `ad•••@example.com`: enough to recognise the address without displaying it in full. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return email
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`
}
