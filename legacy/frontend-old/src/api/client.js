export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Absolute URL for an `/uploads/...` path returned by the API. */
export const mediaUrl = (path) => (path ? `${API_BASE}${path}` : null);
export const certificateUrl = (workId) => `${API_BASE}/api/works/${workId}/certificate`;
export const recordJsonUrl = (workId) => `${API_BASE}/api/public/works/${workId}/record.json`;
export const proofUrl = (workId) => `${API_BASE}/api/public/works/${workId}/proof.ots`;
export const verifyPath = (workId) => `/verify/${workId}`;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// FastAPI returns `detail` as a string, a list of validation errors (422),
// or (for our 409 duplicate response) an object with a `message`.
const formatDetail = (detail, status) => {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => String(d.msg || '').replace(/^Value error, /, '')).join(' ');
  }
  if (detail && typeof detail === 'object' && detail.message) return detail.message;
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return `Request failed (${status})`;
};

/**
 * Fetch wrapper. Pass `json` to send a JSON body, `form` for urlencoded,
 * or `body` (e.g. FormData) as usual.
 */
export const apiClient = async (endpoint, { json, form, ...options } = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body = options.body;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  } else if (form !== undefined) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    body = new URLSearchParams(form);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, body });
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 && token && !endpoint.startsWith('/api/auth/login')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(formatDetail(errorData.detail, response.status), response.status, errorData.detail);
  }
  return response.json();
};
