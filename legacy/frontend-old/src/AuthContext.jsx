import { createContext, useCallback, useEffect, useState } from 'react';
import { apiClient } from './api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [user, setUser] = useState(null);
    // 'loading' while we validate a stored token, then 'authed' or 'guest'
    const [status, setStatus] = useState(() => (localStorage.getItem('token') ? 'loading' : 'guest'));

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setStatus('guest');
    }, []);

    const login = useCallback((newToken, newUser) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
        setStatus('authed');
    }, []);

    // Validate a token restored from a previous visit.
    useEffect(() => {
        if (!token || user) return;
        let cancelled = false;
        apiClient('/api/auth/me')
            .then((me) => {
                if (cancelled) return;
                setUser(me);
                setStatus('authed');
            })
            .catch(() => !cancelled && logout());
        return () => { cancelled = true; };
    }, [token, user, logout]);

    useEffect(() => {
        window.addEventListener('auth:expired', logout);
        return () => window.removeEventListener('auth:expired', logout);
    }, [logout]);

    return (
        <AuthContext.Provider value={{ token, user, status, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
