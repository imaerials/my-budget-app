import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAccessToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // null  = not yet determined (loading)
  // false = determined, not logged in
  const [ready, setReady] = useState(false);

  // Called when a 401 cannot be recovered — send user to login
  const handleUnauthorized = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  // Try to restore session on first load using the httpOnly refresh cookie
  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);

    async function restoreSession() {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const { accessToken, user } = await res.json();
          setAccessToken(accessToken);
          setUser(user);
        }
      } catch {
        // No valid session — stay logged out
      } finally {
        setReady(true);
      }
    }

    restoreSession();
  }, [handleUnauthorized]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const data = await api.register({ name, email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
