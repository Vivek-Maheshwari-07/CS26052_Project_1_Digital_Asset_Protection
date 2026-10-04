import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { mockCurrentUser } from '../data/mockData';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('veri_app_user');
      if (savedUser) return JSON.parse(savedUser);
      // Default to mock user for seamless developer & reviewer experience
      return mockCurrentUser;
    } catch {
      return mockCurrentUser;
    }
  });

  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('veri_app_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('veri_app_user');
    }
  }, [user]);

  const login = async (credentials) => {
    setAuthLoading(true);
    try {
      const loggedUser = await authService.login(credentials);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setAuthLoading(false);
    }
  };

  const signup = async (userData) => {
    setAuthLoading(true);
    try {
      const newUser = await authService.signup(userData);
      setUser(newUser);
      return newUser;
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setAuthLoading(true);
    try {
      const gUser = await authService.loginWithGoogle();
      setUser(gUser);
      return gUser;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem('veri_app_user');
      localStorage.removeItem('veri_auth_token');
    } finally {
      setAuthLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    setAuthLoading(true);
    try {
      const updated = await authService.updateProfile(updates);
      setUser(updated);
      return updated;
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateProfile,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
