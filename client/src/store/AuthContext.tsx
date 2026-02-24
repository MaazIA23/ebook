import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, login as apiLogin } from "../api/auth";
import type { User, LoginResponse } from "../api/auth";
import { setAuthToken } from "../api/http";

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function init() {
      if (token) {
        setAuthToken(token);
        try {
          const me = await getMe();
          setUser(me);
        } catch {
          setToken(null);
          localStorage.removeItem("token");
          setAuthToken(null);
        }
      }
      setLoading(false);
    }
    void init();
  }, [token]);

  async function login(email: string, password: string) {
    const res: LoginResponse = await apiLogin(email, password);
    const newToken = res.access_token;
    setToken(newToken);
    localStorage.setItem("token", newToken);
    setAuthToken(newToken);
    const me = await getMe();
    setUser(me);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    setAuthToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}