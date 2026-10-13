/**
 * Fetch client for the FastAPI backend. Sends the stored bearer token, normalises FastAPI's
 * `detail` payloads into readable messages and signals an expired session via `auth:expired`.
 */
export const API_BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const TOKEN_KEY = 'token'

/** Absolute URL for an `/uploads/...` path returned by the API. */
export const mediaUrl = (path?: string | null) => (path ? `${API_BASE}${path}` : null)
export const certificateUrl = (workId: string) => `${API_BASE}/api/works/${workId}/certificate`
export const recordJsonUrl = (workId: string) => `${API_BASE}/api/public/works/${workId}/record.json`
export const proofUrl = (workId: string) => `${API_BASE}/api/public/works/${workId}/proof.ots`
export const verifyPath = (workId: string) => `/verify/${workId}`

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

type ValidationItem = { msg?: string }

// FastAPI returns `detail` as a string, a list of validation errors (422),
// or (for the 409 duplicate response) an object with a `message`.
export function formatDetail(detail: unknown, status: number): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d: ValidationItem) => String(d.msg || '').replace(/^Value error, /, '')).join(' ')
  }
  if (detail && typeof detail === 'object' && 'message' in detail) return String((detail as { message: unknown }).message)
  if (status >= 500) return 'Something went wrong on our side. Please try again.'
  return `Request failed (${status})`
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  /** Sent as a JSON body. */
  json?: unknown
  /** Sent as application/x-www-form-urlencoded (used by the OAuth2 login form). */
  form?: Record<string, string>
  body?: BodyInit | null
}

export async function apiClient<T = unknown>(endpoint: string, { json, form, ...options }: ApiOptions = {}): Promise<T> {
  let token: string | null = null
  try {
    token = localStorage.getItem(TOKEN_KEY)
  } catch {
    token = null
  }

  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let body = options.body
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(json)
  } else if (form !== undefined) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded')
    body = new URLSearchParams(form)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, body })
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0)
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    if (response.status === 401 && token && !endpoint.startsWith('/api/auth/login')) {
      window.dispatchEvent(new Event('auth:expired'))
    }
    throw new ApiError(formatDetail(errorData.detail, response.status), response.status, errorData.detail)
  }
  return response.json() as Promise<T>
}
