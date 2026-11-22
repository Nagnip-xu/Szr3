"use client";

import { workspaceApi, projectsApi } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/FormControls";
import type { WorkspaceResponse } from "@/lib/types/auth";
import {
  Clock,
  FolderOpen,
  HardDrive,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function WorkspaceView() {
  const { user, organization, refreshProfile } = useAuth();
  const {
    project,
    updateProject,
    setActiveTab,
    setWorkflowStep,
    showToast,
    loadProject,
    resetProject,
  } = useProject();
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const loadWorkspace = useCallback(async () => {
    try {
      const data = await workspaceApi.get();
      setWorkspace(data);
      setOrgName(data.organization.name);
    } catch {
      showToast("加载创作空间失败");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = window.setTimeout(loadWorkspace, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  const openStudio = () => {
    setActiveTab("studio");
    setWorkflowStep("script");
  };

  const handleSaveOrgName = async () => {
    try {
      await workspaceApi.updateOrganization(orgName);
      await refreshProfile();
      await loadWorkspace();
      setEditingName(false);
      showToast("团队名称已更新");
    } catch {
      showToast("更新失败");
    }
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;

    setCreating(true);
    try {
      resetProject();
      const created = await projectsApi.create(name);
      updateProject({
        projectId: created.id,
        projectName: created.name ?? name,
      });
      setShowCreate(false);
      setNewProjectName("");
      openStudio();
      showToast(`已创建项目「${name}」`);
      loadWorkspace();
    } catch {
      showToast("创建项目失败");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    try {
      await projectsApi.remove(deleteTarget.id);
      if (project.projectId === deleteTarget.id) {
        resetProject();
      }
      showToast(`已删除项目「${deleteTarget.name}」`);
      setDeleteTarget(null);
      loadWorkspace();
    } catch {
      showToast("删除项目失败");
    } finally {
      setDeletingId(null);
    }
  };

  const org = workspace?.organization ?? organization;
  const usagePercent = org
    ? Math.round((org.usedMinutes / org.quotaMinutes) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-8">
      <Dialog
        open={showCreate}
        onClose={() => !creating && setShowCreate(false)}
        closeOnBackdrop={!creating}
        closeOnEscape={!creating}
        showClose
        ariaLabel="新建项目"
      >
        <div className="mb-5 pr-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">新建项目</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            为项目起一个名字，便于在创作空间中识别与管理。
          </p>
        </div>

        <Input
          label="项目名称"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="例如：春季新品口播"
          autoFocus
          maxLength={60}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newProjectName.trim() && !creating) {
              void handleCreateProject();
            }
          }}
        />

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreate(false)}
            disabled={creating}
          >
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleCreateProject()}
            disabled={!newProjectName.trim() || creating}
            loading={creating}
          >
            {creating ? "创建中…" : "创建并进入工作台"}
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget ? `删除「${deleteTarget.name}」？` : "删除项目？"}
        description="此操作不可恢复。项目内的文案、配音、成片与上传文件将被永久清除。"
        confirmLabel="确认删除"
        cancelLabel="取消"
        variant="danger"
        loading={!!deletingId}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            创作空间
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            管理项目、查看用量，打开项目后回到工作台继续创作。
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setNewProjectName("");
            setShowCreate(true);
          }}
        >
          <Plus className="size-4" />
          新建项目
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 lg:col-span-2">
          {editingName ? (
            <div className="flex flex-wrap gap-2">
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="primary" size="sm" onClick={handleSaveOrgName}>
                保存
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>
                取消
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{org?.name}</h2>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-xs text-[var(--accent-bright)] hover:underline"
              >
                编辑名称
              </button>
            </div>
          )}
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {user?.name} · {user?.email}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat icon={Clock} label="已用分钟" value={`${org?.usedMinutes ?? 0} / ${org?.quotaMinutes ?? 0}`} />
            <Stat icon={HardDrive} label="存储" value={`${org?.quotaStorage ?? 0} MB`} />
            <Stat icon={FolderOpen} label="项目" value={String(workspace?.organization.projectCount ?? 0)} />
            <Stat icon={Users} label="成员" value={String(workspace?.organization.memberCount ?? 0)} />
          </dl>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-[var(--text-muted)]">
              <span>本月用量</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">团队成员</h3>
          <ul className="space-y-2">
            {workspace?.members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                  {member.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--foreground)]">{member.name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{member.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">最近项目</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              每个项目独立保存文案、配音与成片数据，互不影响。
            </p>
          </div>
        </div>
        {workspace?.recentProjects.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <FolderOpen className="mb-3 size-10 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-secondary)]">还没有项目，点击上方新建开始</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspace?.recentProjects.map((p) => {
              const isActive = project.projectId === p.id;
              const isDeleting = deletingId === p.id;

              return (
                <div
                  key={p.id}
                  className={`group relative rounded-[var(--radius-md)] border bg-[var(--surface-muted)] transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-dim)] ${
                    isActive
                      ? "border-[var(--accent-ring)] ring-1 ring-[var(--accent-dim)]"
                      : "border-[var(--border-subtle)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      void loadProject(p.id);
                      openStudio();
                    }}
                    className="w-full p-4 pr-12 text-left"
                  >
                    <p className="font-medium text-[var(--foreground)]">{p.name}</p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {isActive ? "当前打开 · " : ""}
                      {p.status} · {new Date(p.updatedAt).toLocaleDateString("zh-CN")}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                    disabled={isDeleting}
                    className="absolute right-2 top-2 rounded-[var(--radius-md)] p-2 text-[var(--text-muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
                    aria-label={`删除项目 ${p.name}`}
                    title="删除项目"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
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
      <Icon className="mb-2 size-4 text-[var(--text-muted)]" />
      <dt className="text-[11px] text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
