"use client";

import { api } from "@/lib/api/client";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Input, Textarea } from "@/components/ui/FormControls";
import { Link2 } from "lucide-react";
import { useState } from "react";

export function ExtractPanel() {
  const { project, updateProject, loading, setLoading, showToast } = useProject();
  const [extractStage, setExtractStage] = useState<string | null>(null);
  const handleExtract = async () => {
    if (!project.sourceUrl.trim()) { showToast("请输入视频链接"); return; }
    setLoading("extract", true);
    setExtractStage("正在解析视频链接并提取口播，请勿关闭页面");
    try {
      const res = await api.extractScript(project.sourceUrl, project.projectId ?? undefined);
      if (!res.success || !res.data) { showToast(res.message ?? "提取失败"); return; }
      updateProject({ originalScript: res.data.script, parsedTitle: res.data.title ?? "", parsedCover: res.data.cover ?? "", parsedVideoUrl: res.data.videoUrl ?? null, coverText: res.data.title || project.coverText, subtitleSegments: res.data.subtitleSegments ?? [], durationMs: res.data.durationMs ?? 0, asrModel: res.data.asrModel ?? "", hasWordTimestamps: res.data.hasWordTimestamps ?? false });
      showToast("文案与字幕时间轴已提取");
    } finally {
      setLoading("extract", false);
      setExtractStage(null);
    }
  };
  return <Panel step={1} title="提取文案" completed={!!project.originalScript}>
    <Input label="视频链接" placeholder="粘贴抖音 / 视频号链接" value={project.sourceUrl} onChange={(e) => updateProject({ sourceUrl: e.target.value })} />
    <Button variant="primary" fullWidth onClick={handleExtract} loading={loading.extract}><Link2 className="size-4" />提取文案</Button>
    {extractStage && (
      <p className="-mt-1 text-center text-xs text-[var(--text-secondary)]" aria-live="polite">
        {extractStage}
      </p>
    )}
    <Textarea label="原始文案" value={project.originalScript} placeholder="提取结果将在这里显示" onChange={(e) => updateProject({ originalScript: e.target.value })} className="min-h-[260px]" />
  </Panel>;
}
