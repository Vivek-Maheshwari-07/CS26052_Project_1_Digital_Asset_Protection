/**
 * Authentication Service
 * Communicates with FastAPI auth endpoints (/api/auth/login, /api/auth/signup, etc.)
 */
import { mockDelay, USE_MOCK } from './api';
import { mockCurrentUser } from '../data/mockData';

export const authService = {
  async login(credentials) {
    if (USE_MOCK) {
      await mockDelay(600);
      if (credentials.email && credentials.password) {
        const user = {
          ...mockCurrentUser,
          email: credentials.email,
          name: credentials.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Alex Vance'
        };
        localStorage.setItem('veri_auth_token', 'mock_jwt_token_veriframe_2026');
        return user;
      }
      throw new Error('Please enter valid email and password');
    }

    // Backend implementation:
    // const res = await apiClient('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    // return res.data;
  },

  async signup(userData) {
    if (USE_MOCK) {
      await mockDelay(700);
      const user = {
        ...mockCurrentUser,
        id: `usr_vf_${Math.random().toString(36).substr(2, 6)}`,
        name: userData.name || 'New Creator',
        email: userData.email,
        stats: {
          registeredAssets: 0,
          verificationChecks: 0,
          potentialMatches: 0,
          certificatesIssued: 0,
          storageUsedMb: 0,
          storageLimitMb: 1024
        }
      };
      localStorage.setItem('veri_auth_token', 'mock_jwt_token_veriframe_2026');
      return user;
    }
  },

  async loginWithGoogle() {
    if (USE_MOCK) {
      await mockDelay(500);
      localStorage.setItem('veri_auth_token', 'mock_oauth_google_veriframe_2026');
      return mockCurrentUser;
    }
  },

  async logout() {
    if (USE_MOCK) {
      await mockDelay(200);
      localStorage.removeItem('veri_auth_token');
      return true;
    }
  },

  async getCurrentUser() {
    if (USE_MOCK) {
      const token = localStorage.getItem('veri_auth_token');
      if (!token) return null;
      return mockCurrentUser;
    }
  },

  async updateProfile(updates) {
    if (USE_MOCK) {
      await mockDelay(400);
      return { ...mockCurrentUser, ...updates };
    }
  }
};

export default authService;
