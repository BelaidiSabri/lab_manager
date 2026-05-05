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
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(u: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  currentGrade?: string;
  academicProgram?: PublicUser['academicProgram'];
  isFirstLogin: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}): PublicUser {
  return { ...u };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const t = tokenStorage.get();
    if (!t) {
      setUser(null);
      return;
    }
    const { data } = await api.get<{ user: PublicUser }>('/auth/me');
    setUser(mapUser(data.user as PublicUser));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        let t = tokenStorage.get();
        if (!t) {
          try {
            const { data } = await api.post<{ accessToken: string; token: string; user: PublicUser }>(
              '/auth/refresh',
              {}
            );
            t = data.accessToken ?? data.token;
            if (t) {
              tokenStorage.set(t);
              setToken(t);
            }
            if (data.user) {
              if (!cancelled) {
                setUser(mapUser(data.user as PublicUser));
              }
            } else if (t) {
              const me = await api.get<{ user: PublicUser }>('/auth/me');
              if (!cancelled) setUser(mapUser(me.data.user as PublicUser));
            }
          } catch {
            tokenStorage.clear();
            if (!cancelled) {
              setToken(null);
              setUser(null);
            }
          }
        } else {
          setToken(t);
          try {
            await refreshUser();
          } catch {
            tokenStorage.clear();
            if (!cancelled) {
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setError("Impossible de joindre le serveur. Vérifiez que l'API tourne et que le proxy Vite est actif.");
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
    const { data } = await api.post<{ token: string; accessToken?: string; user: PublicUser }>('/auth/login', {
      email,
      password,
    });
    const access = data.accessToken ?? data.token;
    tokenStorage.set(access);
    setToken(access);
    const u = mapUser(data.user as PublicUser);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // still clear local session
    }
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setError(null);
    const { data } = await api.post<{ token: string; accessToken?: string; user: PublicUser }>(
      '/auth/change-password',
      { currentPassword, newPassword }
    );
    const access = data.accessToken ?? data.token;
    tokenStorage.set(access);
    setToken(access);
    setUser(mapUser(data.user as PublicUser));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      error,
      login,
      logout,
      changePassword,
      refreshUser,
      clearError,
    }),
    [user, token, loading, error, login, logout, changePassword, refreshUser, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
