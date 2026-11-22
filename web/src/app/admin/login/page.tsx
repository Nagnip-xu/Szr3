"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormControls";
import { authApi } from "@/lib/api/client";
import { setToken } from "@/lib/api/http";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await authApi.adminLogin(email.trim(), password);
      setToken(response.token);
      window.location.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "管理员登录失败");
    } finally {
      setLoading(false);
    }
  };

  return <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)] px-4"><div className="w-full max-w-sm"><div className="mb-7 flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-dim)] text-[var(--accent-bright)] ring-1 ring-[var(--accent-ring)]"><ShieldCheck className="size-5" /></div><div><h1 className="text-lg font-semibold text-[var(--foreground)]">管理员控制台</h1><p className="mt-0.5 text-xs text-[var(--text-muted)]">仅限平台唯一管理员登录</p></div></div><form onSubmit={submit} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6"><div className="space-y-4"><Input label="管理员邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /><Input label="管理员密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div>{error && <p className="mt-4 rounded-[var(--radius-md)] bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}<Button className="mt-6" type="submit" variant="primary" size="lg" fullWidth loading={loading}>登录管理后台</Button></form><p className="mt-4 text-center text-[11px] text-[var(--text-muted)]">该端口不提供视频创作功能</p></div></main>;
}
