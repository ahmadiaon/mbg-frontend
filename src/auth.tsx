import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { accessApi, authApi, type AccessBootstrap, type LoginResult, type LoginUser } from './api';

interface AuthContextValue {
  token: string | null;
  user: LoginUser | null;
  access: AccessBootstrap | null;
  accessLoading: boolean;
  login: (nrp: string, credential: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('mbg_token'),
  );
  const [user, setUser] = useState<LoginUser | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('mbg_user') || 'null');
    } catch {
      return null;
    }
  });
  const [access, setAccess] = useState<AccessBootstrap | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('mbg_access') || 'null');
    } catch {
      return null;
    }
  });
  const [accessLoading, setAccessLoading] = useState(() => Boolean(localStorage.getItem('mbg_token')));

  useEffect(() => {
    if (!token) {
      setAccess(null);
      setAccessLoading(false);
      return;
    }
    setAccessLoading(true);
    accessApi
      .bootstrap()
      .then((result) => {
        setAccess(result);
        localStorage.setItem('mbg_access', JSON.stringify(result));
      })
      .catch(() => undefined)
      .finally(() => setAccessLoading(false));
  }, [token]);

  async function login(nrp: string, credential: string) {
    const res = await authApi.login(nrp, credential);
    if (res.status === 'success') {
      localStorage.setItem('mbg_token', res.token);
      localStorage.setItem('mbg_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  }

  function logout() {
    localStorage.removeItem('mbg_token');
    localStorage.removeItem('mbg_user');
    localStorage.removeItem('mbg_access');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, access, accessLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
