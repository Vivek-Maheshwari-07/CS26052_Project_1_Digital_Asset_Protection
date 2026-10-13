import * as React from 'react'

import type { AuthState, User } from '@/auth/types'
import { apiClient, TOKEN_KEY } from '@/lib/api'

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

// oxlint-disable-next-line react/only-export-components
export const AuthContext = React.createContext<AuthState>({
  token: null,
  user: null,
  status: 'guest',
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(readToken)
  const [user, setUser] = React.useState<User | null>(null)
  // 'loading' while a stored token is validated, then 'authed' or 'guest'.
  const [status, setStatus] = React.useState<AuthState['status']>(() => (readToken() ? 'loading' : 'guest'))

  const logout = React.useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Storage unavailable: the in-memory session is still cleared.
    }
    setToken(null)
    setUser(null)
    setStatus('guest')
  }, [])

  const login = React.useCallback((newToken: string, newUser: User) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken)
    } catch {
      // Storage unavailable: the session lasts until the tab closes.
    }
    setToken(newToken)
    setUser(newUser)
    setStatus('authed')
  }, [])

  // Validate a token restored from a previous visit.
  React.useEffect(() => {
    if (!token || user) return
    let cancelled = false
    apiClient<User>('/api/auth/me')
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authed')
      })
      .catch(() => !cancelled && logout())
    return () => {
      cancelled = true
    }
  }, [token, user, logout])

  React.useEffect(() => {
    window.addEventListener('auth:expired', logout)
    return () => window.removeEventListener('auth:expired', logout)
  }, [logout])

  const value = React.useMemo(() => ({ token, user, status, login, logout }), [token, user, status, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  return React.useContext(AuthContext)
}
