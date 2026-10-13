/** Mirrors `public_user()` in backend/app/api/auth.py. */
export type User = {
  id: string
  username: string
  email: string | null
  full_name: string
  created_at: string | null
}

/** Mirrors `_session()`: returned by login and signup verification. */
export type Session = {
  access_token: string
  token_type: 'bearer'
  user: User
}

/** Returned by signup/start, otp/resend and password/forgot. */
export type OtpIssued = {
  email: string
  resend_in: number
  sent: boolean
}

export type AuthStatus = 'loading' | 'authed' | 'guest'

export type AuthState = {
  token: string | null
  user: User | null
  status: AuthStatus
  login: (token: string, user: User) => void
  logout: () => void
}
