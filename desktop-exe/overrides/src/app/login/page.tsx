"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/FormControls";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SavedCredentials = { email: string; password: string };

type DesktopBridge = {
  isDesktop?: boolean;
  credentials?: {
    get: () => Promise<SavedCredentials | null>;
    save: (value: SavedCredentials) => Promise<void>;
    clear: () => Promise<void>;
  };
};

function desktopBridge(): DesktopBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { szr3Desktop?: DesktopBridge }).szr3Desktop;
}

function OrbitLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
      <circle cx="26" cy="12" r="2" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export default function LoginPage() {
  const { login, register, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const credentials = desktopBridge()?.credentials;
    if (!credentials) return;
    void credentials.get().then((saved) => {
      if (!saved) return;
      setEmail(saved.email);
      setPassword(saved.password);
      setRememberPassword(true);
    });
  }, []);

  const handleRememberPassword = (checked: boolean) => {
    setRememberPassword(checked);
    if (!checked) void desktopBridge()?.credentials?.clear();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致，请重新确认。");
      return;
    }

    setSubmitting(true);
    const result =
      mode === "login"
        ? await login(email, password)
        : await register({
            email,
            password,
            name,
            organizationName: orgName,
            registrationCode,
          });
    setSubmitting(false);

    if (result) {
      setError(result);
      return;
    }

    if (mode === "login") {
      const credentials = desktopBridge()?.credentials;
      if (rememberPassword) {
        await credentials?.save({ email, password });
      } else {
        await credentials?.clear();
      }
    }
    router.replace("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)]">
        <div className="size-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-[var(--background)] px-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(79,124,255,0.16),transparent)]" />
      <div className="relative grid w-full max-w-4xl grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:block">
          <div className="mb-6 flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-dim)] text-[var(--accent-bright)] ring-1 ring-[var(--accent-ring)]">
            <OrbitLogo className="size-8" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">星轨 · 数字人</h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
            从链接解析到数字人生成，再到字幕包装与导出。为口播视频提供清晰完整的工作流。
          </p>
        </div>

        <div>
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-dim)] text-[var(--accent-bright)]"><OrbitLogo className="size-7" /></div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">星轨 · 数字人</h1>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-8">
            <div className="mb-6 flex rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1">
              <button type="button" onClick={() => { setMode("login"); setError(""); }} className={`flex-1 rounded-[var(--radius-sm)] py-2 text-sm font-medium transition ${mode === "login" ? "bg-[var(--accent-dim)] text-[var(--accent-bright)]" : "text-[var(--text-muted)]"}`}>登录</button>
              <button type="button" onClick={() => { setMode("register"); setError(""); }} className={`flex-1 rounded-[var(--radius-sm)] py-2 text-sm font-medium transition ${mode === "register" ? "bg-[var(--accent-dim)] text-[var(--accent-bright)]" : "text-[var(--text-muted)]"}`}>注册</button>
            </div>

            <div className="space-y-4">
              {mode === "register" && <>
                <Input label="姓名" value={name} onChange={(e) => setName(e.target.value)} placeholder="张三" required />
                <Input label="团队名称" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="星轨工作室" required />
                <Input label="注册码" value={registrationCode} onChange={(e) => setRegistrationCode(e.target.value.toUpperCase())} placeholder="SZR3-XXXXXX-XXXXXX" required />
                <p className="-mt-2 text-xs leading-relaxed text-[var(--text-muted)]">注册码请联系管理员：<a className="text-[var(--accent-bright)] hover:underline" href="mailto:1626814667@qq.com">1626814667@qq.com</a></p>
              </>}
              <Input label="邮箱" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              <Input label="密码" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" required />
              {mode === "register" && <Input label="确认密码" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入密码" required />}
              {mode === "login" && <Checkbox id="remember-password" checked={rememberPassword} onChange={handleRememberPassword} label="记住密码（仅此电脑）" />}
            </div>

            {error && <p className="mt-4 rounded-[var(--radius-md)] bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting} className="mt-6">{mode === "login" ? "进入工作台" : "注册并进入"}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
