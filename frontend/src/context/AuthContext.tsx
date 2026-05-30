import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi, tokenStorage } from '../api/client';
import type { AuthResponse, Role } from '../types';

interface AuthState {
  token: string | null;
  email: string | null;
  role: Role | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_USER = 'payflow.user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readPersistedUser(): { email: string; role: Role } | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = tokenStorage.get();
    const persisted = readPersistedUser();
    return {
      token,
      email: persisted?.email ?? null,
      role: persisted?.role ?? null,
      loading: false,
    };
  });

  const applyAuth = useCallback((res: AuthResponse) => {
    tokenStorage.set(res.token);
    localStorage.setItem(STORAGE_USER, JSON.stringify({ email: res.email, role: res.role }));
    setState({ token: res.token, email: res.email, role: res.role, loading: false });
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const res = await authApi.login(email, password, rememberMe);
        applyAuth(res);
      } finally {
        setState((s) => ({ ...s, loading: false }));
      }
    },
    [applyAuth],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const res = await authApi.register(email, password);
        applyAuth(res);
      } finally {
        setState((s) => ({ ...s, loading: false }));
      }
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    localStorage.removeItem(STORAGE_USER);
    setState({ token: null, email: null, role: null, loading: false });
  }, []);

  // Re-sync if another tab logs out (defensive; very small UX win).
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'payflow.token' && !e.newValue) {
        setState({ token: null, email: null, role: null, loading: false });
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
