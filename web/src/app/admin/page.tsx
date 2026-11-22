"use client";

import { AdminView } from "@/components/admin/AdminView";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

function AdminPageContent() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const allowed = user?.role === "super_admin";
  useEffect(() => { if (!isLoading && !allowed) router.replace("/admin/login"); }, [allowed, isLoading, router]);
  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[var(--background)]"><div className="size-9 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>;
  if (!allowed) return null;
  return <div className="min-h-screen bg-[var(--background)]"><header className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]"><div className="mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-4 lg:px-6"><div className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-dim)] text-[var(--accent-bright)]"><ShieldCheck className="size-5" /></div><div><p className="text-sm font-semibold text-[var(--foreground)]">Szr3 管理控制台</p><p className="text-[11px] text-[var(--text-muted)]">{user?.email}</p></div><button type="button" onClick={logout} className="ml-auto flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--foreground)]"><LogOut className="size-3.5" />退出后台</button></div></header><main className="mx-auto max-w-[1800px] px-4 py-6 lg:px-6 lg:py-8"><AdminView /></main></div>;
}

export default function AdminPage() {
  return <AdminPageContent />;
}
