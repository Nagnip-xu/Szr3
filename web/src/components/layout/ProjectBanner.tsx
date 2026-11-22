"use client";

import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { FolderOpen, Plus } from "lucide-react";

export function ProjectBanner() {
  const { project, setActiveTab, showToast } = useProject();

  if (project.projectId) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--accent-ring)] bg-[var(--accent-dim)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[var(--accent-bright)]">当前项目</p>
          <p className="truncate text-sm font-medium text-[var(--foreground)]">
            {project.projectName || "未命名项目"}
            <span className="ml-2 font-mono text-[10px] text-[var(--text-muted)]">
              {project.projectId.slice(0, 8)}
            </span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setActiveTab("workspace")}>
          <FolderOpen className="size-3.5" />
          切换项目
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3">
      <p className="text-sm text-[var(--text-secondary)]">
        尚未选择项目。生成音频、烧录字幕与导出成片前，请先在创作空间创建或打开项目。
      </p>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          setActiveTab("workspace");
          showToast("请在创作空间新建或打开项目");
        }}
      >
        <Plus className="size-3.5" />
        去创作空间
      </Button>
    </div>
  );
}
