"use client";

import { api } from "@/lib/api/client";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import {
  Input,
  RadioGroup,
  Textarea,
} from "@/components/ui/FormControls";
import { AlertTriangle, CheckCircle2, Link2, ShieldCheck, Wand2 } from "lucide-react";
import { formatMs } from "@/lib/types/subtitle";
import { useState } from "react";

export function ScriptPanel() {
  const { project, updateProject, loading, setLoading, showToast } =
    useProject();
  const [extractHint, setExtractHint] = useState("");
  const [review, setReview] = useState<Awaited<ReturnType<typeof api.reviewScript>>["data"]>(undefined);

  const handleExtract = async () => {
    setLoading("extract", true);
    setExtractHint("解析链接 → 下载视频 → GPU 语音识别，约 30 秒–2 分钟…");
    try {
      const res = await api.extractScript(
        project.sourceUrl,
        project.projectId ?? undefined,
      );
      if (res.success && res.data) {
        updateProject({
          originalScript: res.data.script,
          parsedTitle: res.data.title ?? "",
          parsedCover: res.data.cover ?? "",
          parsedVideoUrl: res.data.videoUrl ?? null,
          coverText: res.data.title || project.coverText,
          subtitleSegments: res.data.subtitleSegments ?? [],
          durationMs: res.data.durationMs ?? 0,
          asrModel: res.data.asrModel ?? "",
          hasWordTimestamps: res.data.hasWordTimestamps ?? false,
        });
        const segCount = res.data.subtitleSegments?.length ?? 0;
        showToast(
          res.data.scriptPending
            ? (res.data.scriptHint ?? "视频解析成功，请手动粘贴或等待 ASR 提取文案")
            : segCount > 0
              ? `文案提取成功 · ${segCount} 条字幕时间轴（${res.data.asrModel ?? "ASR"}）`
              : "文案提取成功（未获取时间轴，将使用句级兜底）",
        );
      } else {
        showToast(res.message ?? "提取失败");
      }
    } finally {
      setLoading("extract", false);
      setExtractHint("");
    }
  };

  const handleRewrite = async () => {
    setLoading("rewrite", true);
    const res = await api.rewriteScript({
      script: project.originalScript,
      mode: project.rewriteMode,
      customPrompt: project.customPrompt,
    });
    setLoading("rewrite", false);
    if (res.success && res.data) {
      updateProject({ rewrittenScript: res.data.script });
      showToast("仿写完成");
    } else {
      showToast(res.message ?? "仿写失败");
    }
  };

  const handleReview = async () => {
    const script = project.rewrittenScript || project.originalScript;
    if (!script.trim()) {
      showToast("请先输入或提取文案");
      return;
    }
    setLoading("review", true);
    const res = await api.reviewScript(script);
    setLoading("review", false);
    if (res.success && res.data) {
      setReview(res.data);
      showToast(res.data.safe ? "审查通过" : "审查完成，请检查风险项");
    } else {
      showToast(res.message ?? "审查失败");
    }
  };

  const applyOptimized = () => {
    if (!review?.optimized) return;
    updateProject({ rewrittenScript: review.optimized });
    showToast("已应用审查优化文案");
  };

  return (
    <Panel step={1} title="文案生成" completed={!!project.rewrittenScript}>
      <Input
        label="视频链接"
        placeholder="粘贴抖音 / 视频号链接..."
        value={project.sourceUrl}
        onChange={(e) => updateProject({ sourceUrl: e.target.value })}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleExtract}
          loading={loading.extract}
        >
          <Link2 className="size-3.5" />
          解析视频链接
        </Button>
        <Button variant="outline" size="sm" disabled>
          一键造爆并发布各平台
        </Button>
      </div>

      {extractHint && (
        <p className="text-xs text-[#7eb8ff]">{extractHint}</p>
      )}

      {project.parsedTitle && (
        <div className="rounded-lg border border-[#3b82f6]/20 bg-[#3b82f6]/5 p-3">
          <p className="text-xs font-medium text-[#7eb8ff]">解析结果</p>
          <p className="mt-1 text-sm text-[#e8edf5]">{project.parsedTitle}</p>
          {project.parsedVideoUrl && (
            <p className="mt-1 truncate text-[11px] text-[#5a6a82]">
              视频已获取 · 无水印地址就绪
              {project.durationMs > 0 &&
                ` · 时长 ${formatMs(project.durationMs)}`}
              {project.subtitleSegments.length > 0 &&
                ` · ${project.subtitleSegments.length} 条字幕轴`}
            </p>
          )}
        </div>
      )}

      {project.subtitleSegments.length > 0 && (
        <div className="max-h-36 overflow-y-auto rounded-lg border border-[#c9922e]/20 bg-[#c9922e]/5 p-3">
          <p className="text-xs font-medium text-[#e8c078]">
            字幕时间轴预览
            {project.hasWordTimestamps ? " · 字级精度" : ""}
          </p>
          <ul className="mt-2 space-y-1">
            {project.subtitleSegments.map((seg, i) => (
              <li
                key={`${seg.beginMs}-${i}`}
                className="text-[11px] leading-relaxed text-[#b8c4d6]"
              >
                <span className="font-mono text-[#7a8aa3]">
                  {formatMs(seg.beginMs)} → {formatMs(seg.endMs)}
                </span>{" "}
                {seg.text}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[10px] text-[#5a6a82]">
            共 {project.subtitleSegments.length} 条，可在此区域滚动查看
          </p>
        </div>
      )}

      <Textarea
        label="原始口播文案"
        placeholder="解析后将自动提取口播文案与字幕时间轴…"
        value={project.originalScript}
        onChange={(e) => updateProject({ originalScript: e.target.value })}
        className="min-h-[140px]"
      />

      <div className="space-y-2 rounded-lg border border-white/[0.06] bg-[#0a0f18]/50 p-3">
        <p className="text-xs font-medium text-[#8b9cb3]">仿写模式</p>
        <RadioGroup
          name="rewrite-mode"
          value={project.rewriteMode}
          onChange={(v) =>
            updateProject({ rewriteMode: v as "auto" | "custom" })
          }
          options={[
            { value: "auto", label: "自动仿写（DeepSeek V4 Flash）" },
            { value: "custom", label: "自定义指令仿写" },
          ]}
        />
        {project.rewriteMode === "custom" && (
          <Input
            placeholder="输入自定义仿写指令..."
            value={project.customPrompt}
            onChange={(e) => updateProject({ customPrompt: e.target.value })}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button variant="primary" fullWidth onClick={handleRewrite} loading={loading.rewrite}>
        <Wand2 className="size-4" />
        执行仿写
      </Button>
      <Button variant="outline" fullWidth onClick={handleReview} loading={loading.review}>
        <ShieldCheck className="size-4" />
        AI 内容审查
      </Button>
      </div>

      {review && (
        <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
          <div className="flex items-center gap-2">
            {review.safe ? <CheckCircle2 className="size-4 text-[var(--success)]" /> : <AlertTriangle className="size-4 text-[#e8b44f]" />}
            <span className="text-xs font-medium text-[var(--foreground)]">{review.summary}</span>
            <span className="ml-auto text-[10px] uppercase text-[var(--text-muted)]">{review.riskLevel}</span>
          </div>
          {review.findings.length > 0 && (
            <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
              {review.findings.map((finding) => <p key={finding.term}><span className="text-[#e8b44f]">{finding.term}</span> → {finding.replacement} · {finding.reason}</p>)}
              <Button size="sm" variant="secondary" onClick={applyOptimized}>应用替换优化</Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
