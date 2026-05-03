import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, tokenStorage } from '../api/client';
import type { PublicUser, UserRole } from '../types/user';

type AuthContextValue = {
  user: PublicUser | null;
  token: string | null;
  needsBootstrap: boolean | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  registerBootstrap: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  registerUserAsAdmin: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const t = tokenStorage.get();
    if (!t) {
      setUser(null);
      return;
    }
    const { data } = await api.get<{ user: PublicUser }>('/auth/me');
    setUser(data.user);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const boot = await api.get<{ needsBootstrap: boolean }>('/auth/bootstrap');
        if (cancelled) return;
        setNeedsBootstrap(boot.data.needsBootstrap);
        const t = tokenStorage.get();
        setToken(t);
        if (t) {
          try {
            await refreshUser();
          } catch {
            tokenStorage.clear();
            setToken(null);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) {
          setError('Impossible de joindre le serveur. Vérifiez que l’API tourne et que le proxy Vite est actif.');
          setNeedsBootstrap(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const { data } = await api.post<{ token: string; user: PublicUser }>('/auth/login', {
      email,
      password,
    });
    tokenStorage.set(data.token);
    setToken(data.token);
    setUser(data.user);
    setNeedsBootstrap(false);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  const registerBootstrap = useCallback(
    async (input: { email: string; password: string; firstName: string; lastName: string }) => {
      setError(null);
      const { data } = await api.post<{ token: string; user: PublicUser }>('/auth/register', input);
      tokenStorage.set(data.token);
      setToken(data.token);
      setUser(data.user);
      setNeedsBootstrap(false);
    },
    []
  );

  const registerUserAsAdmin = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: UserRole;
    }) => {
      setError(null);
      await api.post('/auth/register', input);
      await refreshUser();
    },
    [refreshUser]
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      user,
      token,
      needsBootstrap,
      loading,
      error,
      login,
      logout,
      registerBootstrap,
      registerUserAsAdmin,
      refreshUser,
      clearError,
    }),
    [
      user,
      token,
      needsBootstrap,
      loading,
      error,
      login,
      logout,
      registerBootstrap,
      registerUserAsAdmin,
      refreshUser,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook colocated with provider; Fast Refresh keeps the provider as the hot boundary. */
// eslint-disable-next-line react-refresh/only-export-components -- useAuth is the public API for this module
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
