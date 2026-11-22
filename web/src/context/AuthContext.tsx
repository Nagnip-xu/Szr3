"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/client";
import { setToken } from "@/lib/api/http";
import type { Organization, User } from "@/lib/types/auth";

interface AuthContextValue {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (params: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
    registrationCode: string;
  }) => Promise<string | null>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authApi.me();
      setUser(profile.user);
      setOrganization(profile.organization);
    } catch {
      setUser(null);
      setOrganization(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("szr3_token")
        : null;

    if (!token) {
      const timer = window.setTimeout(() => setIsLoading(false), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      void refreshProfile().finally(() => setIsLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await authApi.login(email, password);
        setToken(res.token);
        await refreshProfile();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "登录失败";
      }
    },
    [refreshProfile],
  );

  const register = useCallback(
    async (params: {
      email: string;
      password: string;
      name: string;
      organizationName: string;
      registrationCode: string;
    }) => {
      try {
        const res = await authApi.register(params);
        setToken(res.token);
        await refreshProfile();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "注册失败";
      }
    },
    [refreshProfile],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setOrganization(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      organization,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, organization, isLoading, login, register, logout, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
