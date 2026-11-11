"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api/client";
import {
  clearAuth,
  getToken,
  getRefreshToken,
  getUser,
  setTokens,
  setUser as storeUser,
  type User,
} from "./token";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Session expired");
  return res.json();
}

// ───────────────────────────────────────────────
// fetchWithAuth — used by all admin/account pages
// ───────────────────────────────────────────────
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  
  const makeRequest = (t: string | null) => {
    const headers = new Headers(options.headers || {});
    if (t) {
      headers.set("Authorization", `Bearer ${t}`);
    }
    return fetch(url, { ...options, headers });
  };

  let response = await makeRequest(token);

  // If 401, try to refresh the token
  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setTokens(data.access_token, data.refresh_token);
          response = await makeRequest(data.access_token);
        } else {
          // Refresh failed — clear auth
          clearAuth();
          document.cookie = "zorvi_access_token=; path=/; max-age=0; SameSite=Lax";
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login?return=" + encodeURIComponent(window.location.pathname);
          }
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }
  }

  return response;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedToken = getToken();
      const storedRefreshToken = getRefreshToken();
      const storedUser = getUser();

      if (!storedToken && !storedRefreshToken) {
        setIsLoading(false);
        return;
      }

      // 1. Try the access token
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) setUser(storedUser);

        try {
          const me = await fetchMe(storedToken);
          setUser(me);
          storeUser(me);
          setIsLoading(false);
          return;
        } catch {
          // Token expired, fall through to refresh
        }
      }

      // 2. Try the refresh token
      if (storedRefreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: storedRefreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setTokens(data.access_token, data.refresh_token);
            document.cookie = `zorvi_access_token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

            const me = await fetchMe(data.access_token);
            setUser(me);
            storeUser(me);
            setToken(data.access_token);
          } else {
            throw new Error("Refresh failed");
          }
        } catch {
          clearAuth();
          setToken(null);
          setUser(null);
          document.cookie = "zorvi_access_token=; path=/; max-age=0; SameSite=Lax";
        }
      }

      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("Wrong email or password");
      if (res.status === 422) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail;
        throw new Error(msg || "Invalid input");
      }
      throw new Error("Login failed, please try again");
    }

    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    document.cookie = `zorvi_access_token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

    const me = await fetchMe(data.access_token);
    storeUser(me);
    setUser(me);
    setToken(data.access_token);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName || null }),
    });

    if (!res.ok) {
      if (res.status === 409) throw new Error("This email is already registered");
      if (res.status === 422) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail;
        throw new Error(msg || "Invalid input");
      }
      throw new Error("Registration failed, please try again");
    }

    await login(email, password);
  };

  const logout = () => {
    clearAuth();
    document.cookie = "zorvi_access_token=; path=/; max-age=0; SameSite=Lax";
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
