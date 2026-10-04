/**
 * VeriFrame API Central Layer
 * Standardized client for communication with the FastAPI backend.
 * Set VITE_USE_MOCK=false or configure VITE_API_BASE_URL to point to FastAPI.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'; // Defaults to true until backend is active

export const mockDelay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Standard API request wrapper with token authorization & error handling
 */
export async function apiClient(endpoint, options = {}) {
  // If mock mode is forced or server is not contacted
  if (USE_MOCK && !options.forceRemote) {
    await mockDelay(options.delay || 400);
    return { ok: true, data: null, isMock: true };
  }

  const token = localStorage.getItem('veri_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.detail || data?.message || `HTTP Error ${response.status}`);
    }

    return { ok: true, data, status: response.status };
  } catch (error) {
    console.warn(`[VeriFrame API] Request to ${endpoint} failed:`, error.message);
    throw error;
  }
}

export default apiClient;
