"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { setToken } from "@/lib/api/http";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role === "super_admin") {
      setToken(null);
      window.location.replace(`${window.location.protocol}//${window.location.hostname}:3002/admin/login`);
    } else if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router, user?.role]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
          <p className="text-sm text-[#5a6a82]">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role === "super_admin") return null;

  return <>{children}</>;
}
