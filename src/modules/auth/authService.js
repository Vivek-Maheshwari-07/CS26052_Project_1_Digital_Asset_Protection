import { mockDelay } from '../../services/api';

/**
 * Authentication Service layer.
 * Standardized interface to allow easy migration to Supabase Auth or backend API.
 */

export const authService = {
  async login({ email, password }) {
    await mockDelay(700);
    if (email === 'fail@example.com') {
      throw new Error('Invalid email or password combination.');
    }
    const name = email.split('@')[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    
    const user = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: formattedName || 'Verified User',
      email: email.toLowerCase(),
      role: 'Creator / Verifier',
      createdAt: new Date().toISOString()
    };

    return user;
  },

  async signup({ name, email, password }) {
    await mockDelay(800);
    const user = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      email: email.toLowerCase(),
      role: 'Creator / Verifier',
      createdAt: new Date().toISOString()
    };

    return user;
  },

  async loginWithGoogle() {
    await mockDelay(900);
    return {
      id: 'usr_google_' + Math.random().toString(36).substr(2, 9),
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      role: 'Creator / Verifier',
      createdAt: new Date().toISOString()
    };
  },

  async sendPasswordReset(email) {
    await mockDelay(600);
    return { success: true, message: `Reset link sent to ${email}` };
  },

  async logout() {
    await mockDelay(300);
    return { success: true };
  }
};

export default authService;
