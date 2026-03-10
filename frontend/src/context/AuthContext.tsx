import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types';
import { getMe } from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  loading: boolean;
  isImpersonating: boolean;
  isViewingAs: boolean;
  startImpersonation: (token: string, user: AuthUser) => void;
  startViewAs: (token: string, user: AuthUser) => void;
  returnToAdmin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isViewingAs, setIsViewingAs] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      const override = localStorage.getItem('sessionOverride');
      setIsImpersonating(override === 'impersonate');
      setIsViewingAs(override === 'view');
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

  function updateUser(updated: AuthUser) {
    setUser(updated);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('sessionOverride');
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
    setIsViewingAs(false);
  }

  function startImpersonation(newToken: string, newUser: AuthUser) {
    localStorage.setItem('adminToken', token!);
    localStorage.setItem('adminUser', JSON.stringify(user));
    localStorage.setItem('sessionOverride', 'impersonate');
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    setIsImpersonating(true);
    setIsViewingAs(false);
  }

  function startViewAs(newToken: string, newUser: AuthUser) {
    localStorage.setItem('adminToken', token!);
    localStorage.setItem('adminUser', JSON.stringify(user));
    localStorage.setItem('sessionOverride', 'view');
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    setIsViewingAs(true);
    setIsImpersonating(false);
  }

  function returnToAdmin() {
    const adminToken = localStorage.getItem('adminToken');
    const adminUserRaw = localStorage.getItem('adminUser');
    if (!adminToken || !adminUserRaw) return;
    const adminUser: AuthUser = JSON.parse(adminUserRaw);
    localStorage.setItem('token', adminToken);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('sessionOverride');
    setToken(adminToken);
    setUser(adminUser);
    setIsImpersonating(false);
    setIsViewingAs(false);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading, isImpersonating, isViewingAs, startImpersonation, startViewAs, returnToAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
