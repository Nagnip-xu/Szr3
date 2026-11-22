"use client";

import { api } from "@/lib/api/client";
import { downloadProjectFinal, pollRenderJob } from "@/lib/api/render-jobs";
import { withAuthToken } from "@/lib/api/asset-url";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import {
  Checkbox,
  Input,
  Select,
  Textarea,
} from "@/components/ui/FormControls";
import { Panel } from "@/components/ui/Panel";
import { Download, ImageIcon } from "lucide-react";

export function PublishView() {
  const { project, updateProject, loading, setLoading, showToast } =
    useProject();

  const previewUrl =
    project.finalVideoUrl ??
    project.processedVideoUrl ??
    project.digitalHumanVideoUrl ??
    project.coverUrl ??
    "";
  const mediaPreviewUrl = withAuthToken(previewUrl);

  const sourceVideoUrl =
    project.processedVideoUrl ??
    project.digitalHumanVideoUrl ??
    project.parsedVideoUrl;

  const handleGenerateCover = async () => {
    if (!project.projectId) {
      showToast("请先在创作空间创建项目");
      return;
    }
    if (!sourceVideoUrl && !project.parsedCover) {
      showToast("请先生成数字人视频或提供封面背景");
      return;
    }
    if (!project.coverText.trim()) {
      showToast("请先输入封面文案");
      return;
    }
    setLoading("cover", true);
    try {
      const res = await api.generateCover({
        projectId: project.projectId,
        text: project.coverText,
        style: {
          fontSize: Math.round(project.coverFontSize / 10),
          color: project.coverColor,
          position: project.coverPosition,
        },
        videoUrl: sourceVideoUrl,
        baseImageUrl: project.parsedCover || undefined,
      });
      if (!res.success || !res.data?.jobId) {
        showToast(res.message ?? "封面任务提交失败");
        return;
      }
      const job = await pollRenderJob(res.data.jobId, { timeoutMs: 120_000 });
      if (job.status === "failed") {
        showToast(job.error ?? "封面生成失败");
        return;
      }
      const coverUrl = job.coverUrl ?? job.outputFile;
      if (coverUrl) {
        updateProject({ coverUrl });
      }
      showToast("封面生成成功");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading("cover", false);
    }
  };

  const handleRenderAndDownload = async () => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建项目");
      return;
    }
    if (!sourceVideoUrl) {
      showToast("请先完成数字人与包装步骤");
      return;
    }

    setLoading("publish", true);
    try {
      const res = await api.renderFinal({
        projectId: project.projectId,
        videoUrl: sourceVideoUrl,
        subtitleSegments: project.subtitleSegments,
        style: {
          font: project.subtitleFont,
          size: project.subtitleSize,
          bottom: project.subtitleBottom,
          color: project.subtitleColor,
          strokeColor: project.subtitleStrokeColor,
        },
        bgmUrl: project.bgmUrl,
        bgmVolume: project.bgmVolume,
        useBgm: project.useBgm,
        addAiWatermark: project.addAiWatermark,
        audioUrl: project.audioUrl,
        script: project.rewrittenScript || project.originalScript,
        title: project.title,
        pip: project.pip.enabled ? project.pip : undefined,
        coverUrl: project.coverUrl,
        publishWithCover: project.publishWithCover && !!project.coverUrl,
      });

      if (!res.success || !res.data?.jobId) {
        showToast(res.message ?? "成片任务提交失败");
        return;
      }

      showToast("正在合成成片…");
      const job = await pollRenderJob(res.data.jobId, { timeoutMs: 600_000 });
      if (job.status === "failed") {
        showToast(job.error ?? "成片渲染失败");
        return;
      }

      if (job.videoUrl) {
        updateProject({
          finalVideoUrl: job.videoUrl,
          processedVideoUrl: job.videoUrl,
        });
      }

      await downloadProjectFinal(
        project.projectId,
        `${project.title || "星轨成片"}.mp4`,
      );
      showToast("成片已生成并开始下载");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "成片生成失败");
    } finally {
      setLoading("publish", false);
    }
  };

  const handleDownloadOnly = async () => {
    if (!project.projectId) {
      showToast("请先创建项目");
      return;
    }
    try {
      await downloadProjectFinal(
        project.projectId,
        `${project.title || "星轨成片"}.mp4`,
      );
      showToast("开始下载");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "下载失败，请先生成成片");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-[280px] lg:mx-0">
        <p className="mb-3 text-xs text-[var(--text-muted)]">成片预览</p>
        <div className="relative aspect-[9/16] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
          {mediaPreviewUrl ? (
            mediaPreviewUrl.includes(".mp4") ? (
              <video
                src={mediaPreviewUrl}
                poster={project.coverUrl ?? project.parsedCover ?? undefined}
                controls
                className="size-full object-cover"
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaPreviewUrl} alt="预览" className="size-full object-cover" />
            )
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-[var(--text-muted)]">
              完成前面步骤后预览
            </div>
          )}
        </div>
        <Checkbox
          label="添加 AI 生成水印"
          checked={project.addAiWatermark}
          onChange={(v) => updateProject({ addAiWatermark: v })}
        />
      </div>

      <div className="space-y-4">
        <Panel title="发布文案">
          <Textarea
            label="口播正文（只读参考）"
            value={project.rewrittenScript || project.originalScript}
            onChange={(e) => updateProject({ rewrittenScript: e.target.value })}
            className="min-h-[120px]"
          />
          <Input
            label="发布标题"
            value={project.title}
            onChange={(e) => updateProject({ title: e.target.value })}
          />
        </Panel>

        <Panel title="封面">
          <Input
            label="封面文案"
            value={project.coverText}
            onChange={(e) => updateProject({ coverText: e.target.value })}
          />
          <Select
            label="文案位置"
            value={project.coverPosition}
            onChange={(e) =>
              updateProject({
                coverPosition: e.target.value as "top" | "center" | "bottom",
              })
            }
            options={[
              { value: "top", label: "顶部" },
              { value: "center", label: "居中" },
              { value: "bottom", label: "底部" },
            ]}
          />
          <Checkbox
            label="导出时插入封面帧（0.5 秒）"
            checked={project.publishWithCover}
            onChange={(v) => updateProject({ publishWithCover: v })}
          />
          <Button
            variant="secondary"
            fullWidth
            onClick={handleGenerateCover}
            loading={loading.cover}
          >
            <ImageIcon className="size-4" />
            生成封面
          </Button>
        </Panel>

        <Panel title="导出">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            合成字幕、画中画、配乐、封面与水印，导出 MP4 到本地。
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleRenderAndDownload}
              loading={loading.publish}
            >
              <Download className="size-4" />
              生成并下载
            </Button>
            <Button variant="outline" fullWidth onClick={handleDownloadOnly}>
              仅下载已有成片
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
