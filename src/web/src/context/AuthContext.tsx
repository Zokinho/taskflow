import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '@/lib/constants';
import type { User, AuthResponse } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string, timezone?: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: { name?: string; timezone?: string; preferences?: Record<string, unknown> }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function saveAuth(data: AuthResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        clearAuth();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, timezone?: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { email, password, timezone });
    saveAuth(data);
    setUser(data.user);
  }, []);

  const updateUser = useCallback(async (data: { name?: string; timezone?: string; preferences?: Record<string, unknown> }) => {
    const updated = await api.patch<User>('/auth/me', data);
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'ADMIN', loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
