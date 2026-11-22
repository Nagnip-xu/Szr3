"use client";

import { useAuth } from "@/context/AuthContext";
import { useProject } from "@/context/ProjectContext";
import { cn } from "@/lib/utils";
import type { TabId } from "@/lib/types/project";
import {
  FolderKanban,
  LogOut,
  Sparkles,
  UserCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const TABS: { id: TabId; label: string; icon: typeof Sparkles }[] = [
  { id: "studio", label: "工作台", icon: Sparkles },
  { id: "workspace", label: "创作空间", icon: FolderKanban },
  { id: "profile", label: "个人中心", icon: UserCircle },
];

function OrbitLogo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.35"
      />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
      <circle cx="26" cy="12" r="2" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { activeTab, setActiveTab, toast, saveStatus, project } = useProject();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [userMenuOpen]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[var(--background)]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-15%,rgba(79,124,255,0.14),transparent_55%)]"
      />

      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1800px] items-center gap-6 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-dim)] text-[var(--accent-bright)] ring-1 ring-[var(--accent-ring)]">
              <OrbitLogo />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide text-[var(--foreground)]">
                星轨 · 数字人
              </p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">
                {project.projectId
                  ? `${project.projectName || "未命名"} · ${project.projectId.slice(0, 6)}`
                  : "选择或创建项目后开始创作"}
              </p>
            </div>
          </div>

          <nav className="ml-auto flex items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--accent-dim)] text-[var(--accent-bright)] ring-1 ring-[var(--accent-ring)]"
                      : "text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--foreground)]",
                  )}
                >
                  <Icon className="size-4" strokeWidth={active ? 2.2 : 1.8} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {saveStatus !== "idle" && (
              <span className="hidden text-[11px] text-[var(--text-muted)] md:inline">
                {saveStatus === "saving"
                  ? "保存中"
                  : saveStatus === "saved"
                    ? "已保存"
                    : "保存失败"}
              </span>
            )}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white ring-2 ring-white/10"
                title={user?.name}
              >
                {user?.name?.[0] ?? "U"}
              </button>
              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 w-44 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-1 shadow-xl"
                >
                  <p className="border-b border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-muted)]">
                    {user?.email}
                  </p>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveTab("profile");
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--foreground)]"
                  >
                    <UserCircle className="size-3.5" />
                    个人中心
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--foreground)]"
                  >
                    <LogOut className="size-3.5" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <div className="mx-auto max-w-[1800px] px-4 py-6 lg:px-6 lg:py-8">
          {children}
        </div>
      </main>

      <footer className="relative z-10 border-t border-[var(--border-subtle)] px-4 py-3 text-center text-[11px] text-[var(--text-muted)]">
        Built with DUIX.COM · 数字人及声音克隆仅限已取得合法授权的素材使用。
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="rounded-[var(--radius-lg)] border border-[var(--accent-ring)] bg-[var(--surface-elevated)]/95 px-5 py-3 text-sm text-[var(--foreground)] shadow-2xl backdrop-blur-xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
