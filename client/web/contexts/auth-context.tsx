"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, setAccessToken, silentRefresh, type ApiUser } from "@/lib/api-client";

interface AuthState {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount — attempt silent refresh to restore session.
  // Uses the deduplicated silentRefresh so concurrent API calls don't race on the same token.
  useEffect(() => {
    (async () => {
      try {
        const refreshed = await silentRefresh();
        if (refreshed) {
          const me = await authApi.me();
          setUser(me.user);
        }
      } catch {
        // No valid session — stay logged out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (fullName: string, email: string, password: string, role: string) => {
      await authApi.register({ fullName, email, password, role });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me.user);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
