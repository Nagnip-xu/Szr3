"use client";

import { useAuth } from "@/context/AuthContext";
import { useProject } from "@/context/ProjectContext";
import { workspaceApi } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import {
  Clock,
  Database,
  FolderKanban,
  HardDrive,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { WorkspaceResponse } from "@/lib/types/auth";

export function ProfileView() {
  const { user, organization, refreshProfile } = useAuth();
  const { project, saveStatus, setActiveTab } = useProject();
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await workspaceApi.get();
      setWorkspace(data);
    } catch {
      setWorkspace(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      void refreshProfile();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, refreshProfile]);

  const org = workspace?.organization ?? organization;
  const usagePercent = org
    ? Math.min(100, Math.round((org.usedMinutes / org.quotaMinutes) * 100))
    : 0;

  return (
    <div className="animate-fade-up space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          个人中心
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          账号、团队用量与当前项目状态。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="账号" className="lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent)] text-xl font-semibold text-white">
              {user?.name?.[0] ?? "U"}
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">{user?.name}</p>
              <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-center gap-2">
              <User className="size-3.5" />
              <span className="font-mono text-[11px] text-[var(--text-muted)]">{user?.id}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-3.5" /> {user?.email}
            </li>
            <li className="flex items-center gap-2">
              <Shield className="size-3.5" />
              同步：
              {saveStatus === "saving"
                ? "保存中"
                : saveStatus === "saved"
                  ? "已同步"
                  : saveStatus === "error"
                    ? "失败"
                    : "空闲"}
            </li>
          </ul>
        </Panel>

        <Panel title="团队与用量" className="lg:col-span-2">
          <p className="font-semibold text-[var(--foreground)]">{org?.name}</p>
          <p className="text-xs text-[var(--text-muted)]">
            组织 ID · {org?.id?.slice(0, 12)}…
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat icon={Clock} label="分钟" value={`${org?.usedMinutes ?? 0}/${org?.quotaMinutes ?? 0}`} />
            <MiniStat icon={HardDrive} label="存储" value={`${org?.quotaStorage ?? 0} MB`} />
            <MiniStat icon={FolderKanban} label="项目" value={String(org?.projectCount ?? 0)} />
            <MiniStat icon={User} label="成员" value={String(workspace?.members.length ?? 0)} />
          </dl>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-[var(--text-muted)]">
              <span>本月用量</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="当前项目">
          {project.projectId ? (
            <dl className="space-y-2 text-sm">
              <Row label="名称" value={project.projectName || "未命名"} />
              <Row label="ID" value={project.projectId} mono />
              <Row
                label="进度"
                value={
                  [
                    project.originalScript ? "文案" : null,
                    project.audioUrl ? "配音" : null,
                    project.digitalHumanVideoUrl ? "数字人" : null,
                    project.finalVideoUrl ? "成片" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "尚未开始"
                }
              />
            </dl>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">暂无活跃项目</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setActiveTab("workspace")}
          >
            前往创作空间
          </Button>
        </Panel>

        <Panel title="运行环境">
          <dl className="space-y-2 text-sm">
            <Row label="数据库" value="SQLite（开发）" />
            <Row label="媒体" value="FFmpeg" />
            <Row label="数字人" value="HeyGem · Duix-Avatar" />
            <Row label="队列" value="RenderJob（可选 Redis）" />
          </dl>
          <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
            <Database className="mt-0.5 size-3.5 shrink-0" />
            本地开发使用 SQLite；正式上线建议迁移 MySQL 或 PostgreSQL。
          </p>
        </Panel>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon className="mb-1 size-4 text-[var(--text-muted)]" />
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className={`text-[var(--foreground)] ${mono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
