"use client";

import { useProject } from "@/context/ProjectContext";
import { Textarea } from "@/components/ui/FormControls";

export function ScriptRewritePreview() {
  const { project, updateProject } = useProject();
  const hasContent = !!project.rewrittenScript?.trim();

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 lg:sticky lg:top-[92px]">
      <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">仿写预览</p>
      <p className="mb-3 text-[11px] text-[var(--text-muted)]">
        执行仿写后在此编辑成稿，将作为配音与字幕依据
      </p>
      <Textarea
        placeholder="仿写结果将显示在这里…"
        value={project.rewrittenScript}
        onChange={(e) => updateProject({ rewrittenScript: e.target.value })}
        className={cnTextarea(hasContent)}
      />
      {project.originalScript && !hasContent && (
        <p className="mt-3 text-[11px] text-[var(--text-muted)]">
          提示：可先解析链接或填写原文，再点击「执行仿写」
        </p>
      )}
    </div>
  );
}

function cnTextarea(hasContent: boolean) {
  return [
    "min-h-[420px] text-sm leading-7",
    hasContent
      ? "border-[var(--accent-ring)] bg-[var(--accent-dim)]/30"
      : "",
  ].join(" ");
}
