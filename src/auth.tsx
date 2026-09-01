import { createContext, useContext, useState, type ReactNode } from 'react';
import { authApi, type LoginResult, type LoginUser } from './api';

interface AuthContextValue {
  token: string | null;
  user: LoginUser | null;
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
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
