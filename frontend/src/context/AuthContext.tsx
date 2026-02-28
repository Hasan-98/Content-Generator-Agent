import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types';
import { getMe } from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  loading: boolean;
  isImpersonating: boolean;
  startImpersonation: (token: string, user: AuthUser) => void;
  returnToAdmin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setIsImpersonating(!!localStorage.getItem('adminToken'));
      getMe()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function login(newToken: string, newUser: AuthUser) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
  }

  function startImpersonation(newToken: string, newUser: AuthUser) {
    // Save current admin session
    localStorage.setItem('adminToken', token!);
    localStorage.setItem('adminUser', JSON.stringify(user));
    // Switch to target user
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    setIsImpersonating(true);
  }

  function returnToAdmin() {
    const adminToken = localStorage.getItem('adminToken');
    const adminUserRaw = localStorage.getItem('adminUser');
    if (!adminToken || !adminUserRaw) return;
    const adminUser: AuthUser = JSON.parse(adminUserRaw);
    localStorage.setItem('token', adminToken);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setToken(adminToken);
    setUser(adminUser);
    setIsImpersonating(false);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isImpersonating, startImpersonation, returnToAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
