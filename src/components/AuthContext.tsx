"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AuthRole,
  getRoleHomePath,
  LOGIN_PATH,
} from "@/lib/auth-constants";

interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  employee?: {
    id: string;
    name: string;
    photo?: string | null;
  } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthMeResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

interface LoginResponse {
  authenticated?: boolean;
  success?: boolean;
  message?: string;
  user?: AuthUser;
  data?: AuthUser;
  redirectTo?: string;
}

let cachedUser: AuthUser | null | undefined;
let pendingUserRequest: Promise<AuthUser | null> | null = null;

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function isPublicAuthPath(pathname: string) {
  return (
    pathname === LOGIN_PATH ||
    pathname.startsWith(`${LOGIN_PATH}/`) ||
    pathname === "/register" ||
    pathname.startsWith("/register/")
  );
}

async function fetchCurrentUser(force = false) {
  if (!force && cachedUser !== undefined) {
    return cachedUser;
  }

  if (!force && pendingUserRequest) {
    return pendingUserRequest;
  }

  pendingUserRequest = (async () => {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401) {
      cachedUser = null;
      return null;
    }

    const payload = await parseJson<AuthMeResponse>(response);
    if (!response.ok || !payload?.authenticated) {
      cachedUser = null;
      return null;
    }

    const nextUser = payload.user ?? null;
    cachedUser = nextUser;
    return nextUser;
  })().finally(() => {
    pendingUserRequest = null;
  });

  return pendingUserRequest;
}

function storeUser(nextUser: AuthUser | null) {
  cachedUser = nextUser;
  pendingUserRequest = null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    const loadUser = async () => {
      if (isPublicAuthPath(window.location.pathname)) {
        if (isActive) {
          setLoading(false);
        }
        return;
      }

      if (cachedUser !== undefined) {
        if (isActive) {
          setUser(cachedUser);
          setLoading(false);
        }
        return;
      }

      try {
        const nextUser = await fetchCurrentUser();
        if (isActive) {
          setUser(nextUser);
        }
      } catch {
        storeUser(null);
        if (isActive) {
          setUser(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isActive = false;
    };
  }, []);

  const refetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const nextUser = await fetchCurrentUser(true);
      setUser(nextUser);
    } catch {
      storeUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const res = await parseJson<LoginResponse>(response);
      if (response.ok && (res?.authenticated || res?.success)) {
        const nextUser = res.user ?? res.data ?? null;

        if (!nextUser) {
          return {
            success: false,
            message: "Login berhasil, tetapi data pengguna tidak tersedia",
          };
        }

        storeUser(nextUser);
        setUser(nextUser);
        setLoading(false);
        router.replace(res.redirectTo ?? getRoleHomePath(nextUser.role));
        router.refresh();
        return { success: true };
      }
      return {
        success: false,
        message: res?.message || "Email atau password salah",
      };
    } catch {
      return { success: false, message: "Terjadi kesalahan koneksi" };
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      // Client state is cleared even if the network request fails.
    } finally {
      storeUser(null);
      setUser(null);
      setLoading(false);
      router.replace(LOGIN_PATH);
      router.refresh();
    }
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refetchUser,
    }),
    [loading, login, logout, refetchUser, user]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
