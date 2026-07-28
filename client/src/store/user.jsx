import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/modules.js';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (data) => {
    const u = await authApi.login(data);
    setUser(u);
    window.dispatchEvent(new CustomEvent('vibe:auth-changed'));
    return u;
  };
  const register = async (data) => {
    const u = await authApi.register(data);
    setUser(u);
    window.dispatchEvent(new CustomEvent('vibe:auth-changed'));
    return u;
  };
  const logout = async () => {
    await authApi.logout();
    setUser(null);
    window.dispatchEvent(new CustomEvent('vibe:auth-changed'));
  };

  return (
    <UserContext.Provider value={{ user, loading, refresh, login, register, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
