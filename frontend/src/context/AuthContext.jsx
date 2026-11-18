import { createContext, useContext, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);
const KEY = 'pcparts_auth';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(load);

  const save = (data) => {
    localStorage.setItem(KEY, JSON.stringify(data));
    setAuth(data);
  };

  const login = async (email, password) =>
    save(await api('/auth/login', { method: 'POST', body: { email, password } }));

  const register = async (name, email, password) =>
    save(await api('/auth/register', { method: 'POST', body: { name, email, password } }));

  const logout = () => {
    localStorage.removeItem(KEY);
    setAuth(null);
  };

  const value = { user: auth?.user ?? null, token: auth?.token ?? null, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);