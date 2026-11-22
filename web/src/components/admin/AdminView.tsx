"use client";

import { adminApi } from "@/lib/api/client";
import type { AdminOverview, RegistrationCodeRecord } from "@/lib/types/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormControls";
import { KeyRound, RefreshCw, UsersRound, Video, Clock3, Building2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

export function AdminView() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [codes, setCodes] = useState<RegistrationCodeRecord[]>([]);
  const [count, setCount] = useState("1");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextOverview, nextCodes] = await Promise.all([adminApi.overview(), adminApi.registrationCodes()]);
      setOverview(nextOverview);
      setCodes(nextCodes);
    } catch (err) { setError(err instanceof Error ? err.message : "后台数据加载失败"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const createCodes = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      await adminApi.createRegistrationCodes({ count: Number(count), note: note || undefined, expiresAt: expiresAt || undefined });
      setNote("");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "创建注册码失败"); }
    finally { setCreating(false); }
  };

  const metrics = overview ? [
    { label: "注册用户", value: overview.metrics.userCount, icon: UsersRound },
    { label: "团队", value: overview.metrics.organizationCount, icon: Building2 },
    { label: "项目", value: overview.metrics.projectCount, icon: Video },
    { label: "已用分钟", value: overview.metrics.usedMinutes, icon: Clock3 },
    { label: "可用注册码", value: overview.metrics.availableCodes, icon: KeyRound },
  ] : [];

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-subtle)] pb-4"><div><h1 className="text-xl font-semibold text-[var(--foreground)]">管理员后台</h1><p className="mt-1 text-xs text-[var(--text-muted)]">监控注册账户、组织使用量、项目任务与注册码。</p></div><Button variant="outline" size="sm" onClick={load} loading={loading}><RefreshCw className="size-3.5" />刷新数据</Button></div>
    {error && <p className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{metrics.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4"><Icon className="size-4 text-[var(--accent-bright)]" /><p className="mt-4 text-2xl font-semibold text-[var(--foreground)]">{value}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p></div>)}</div>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,0.75fr)]">
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]"><div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3"><h2 className="text-sm font-semibold text-[var(--foreground)]">注册用户</h2><span className="text-xs text-[var(--text-muted)]">任务处理中 {overview?.metrics.pendingJobs ?? 0} · 已完成 {overview?.metrics.completedJobs ?? 0}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-[var(--surface-muted)] text-[var(--text-muted)]"><tr><th className="px-4 py-3 font-medium">账户</th><th className="px-4 py-3 font-medium">团队</th><th className="px-4 py-3 font-medium">项目</th><th className="px-4 py-3 font-medium">用量</th><th className="px-4 py-3 font-medium">注册时间</th></tr></thead><tbody>{overview?.users.map((user) => <tr key={user.id} className="border-t border-[var(--border-subtle)] text-[var(--text-secondary)]"><td className="px-4 py-3"><p className="font-medium text-[var(--foreground)]">{user.name}</p><p className="mt-1 text-[11px] text-[var(--text-muted)]">{user.email} · {user.role}</p></td><td className="px-4 py-3">{user.organization}</td><td className="px-4 py-3">{user.projectCount}</td><td className="px-4 py-3">{user.usedMinutes} / {user.quotaMinutes} 分钟</td><td className="px-4 py-3">{formatDate(user.createdAt)}</td></tr>)}</tbody></table></div></div>
      <form onSubmit={createCodes} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2"><KeyRound className="size-4 text-[var(--accent-bright)]" /><h2 className="text-sm font-semibold text-[var(--foreground)]">创建注册码</h2></div><p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">每个注册码只能核销一次。注册成功后会永久关联对应账户。</p><div className="mt-4 space-y-3"><Input label="生成数量" type="number" min="1" max="100" value={count} onChange={(e) => setCount(e.target.value)} required /><Input label="备注（可选）" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：8 月客户邀请码" /><Input label="过期时间（可选）" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /><Button type="submit" variant="primary" fullWidth loading={creating}><KeyRound className="size-4" />生成一次性注册码</Button></div></form>
    </section>
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]"><div className="border-b border-[var(--border-subtle)] px-4 py-3"><h2 className="text-sm font-semibold text-[var(--foreground)]">注册码记录</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[var(--surface-muted)] text-[var(--text-muted)]"><tr><th className="px-4 py-3 font-medium">注册码</th><th className="px-4 py-3 font-medium">状态</th><th className="px-4 py-3 font-medium">核销账户</th><th className="px-4 py-3 font-medium">有效期</th><th className="px-4 py-3 font-medium">备注</th></tr></thead><tbody>{codes.map((code) => <tr key={code.id} className="border-t border-[var(--border-subtle)] text-[var(--text-secondary)]"><td className="px-4 py-3 font-medium text-[var(--foreground)]">{code.code}</td><td className="px-4 py-3">{code.usedAt ? <span className="text-[var(--text-muted)]">已使用</span> : <span className="text-[var(--success)]">可用</span>}</td><td className="px-4 py-3">{code.usedBy ? `${code.usedBy.name} · ${code.usedBy.email}` : "-"}</td><td className="px-4 py-3">{formatDate(code.expiresAt)}</td><td className="px-4 py-3">{code.note || "-"}</td></tr>)}</tbody></table></div></section>
  </div>;
}
