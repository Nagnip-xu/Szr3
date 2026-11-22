"use client";

import { api } from "@/lib/api/client";
import { pollRenderJob } from "@/lib/api/render-jobs";
import { uploadProjectFile } from "@/lib/api/upload";
import { withAuthToken } from "@/lib/api/asset-url";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import {
  Checkbox,
  Input,
  Select,
  Slider,
} from "@/components/ui/FormControls";
import {
  PIP_ASSET_TAGS,
  PIP_POSITIONS,
  type PipConfig,
} from "@/lib/types/pip";
import { Layers } from "lucide-react";

export function PipPanel({ step }: { step?: number }) {
  const { project, updateProject, loading, setLoading, showToast } =
    useProject();

  const pip = project.pip;
  const previewUrl =
    project.processedVideoUrl ?? project.digitalHumanVideoUrl ?? "";
  const mediaPreviewUrl = withAuthToken(previewUrl);

  const updatePip = (patch: Partial<PipConfig>) => {
    updateProject({ pip: { ...pip, ...patch } });
  };

  const handleUploadAsset = async (file: File) => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建项目");
      return;
    }
    setLoading("pip-upload", true);
    try {
      const uploaded = await uploadProjectFile(project.projectId, file);
      updatePip({ assetUrl: uploaded.publicUrl });
      showToast("画中画素材已上传");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "上传失败");
    } finally {
      setLoading("pip-upload", false);
    }
  };

  const handleApply = async () => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建项目");
      return;
    }
    const videoUrl =
      project.processedVideoUrl ?? project.digitalHumanVideoUrl ?? "";
    if (!videoUrl) {
      showToast("请先生成数字人视频");
      return;
    }
    if (pip.enabled && !pip.assetUrl) {
      showToast("请先上传画中画素材");
      return;
    }

    setLoading("pip", true);
    try {
      const res = await api.applyPip({
        projectId: project.projectId,
        videoUrl,
        pip,
      });
      if (!res.success || !res.data?.jobId) {
        showToast(res.message ?? "画中画任务提交失败");
        return;
      }
      const job = await pollRenderJob(res.data.jobId, { timeoutMs: 600_000 });
      if (job.status === "failed") {
        showToast(job.error ?? "画中画合成失败");
        return;
      }
      if (job.videoUrl) {
        updateProject({ processedVideoUrl: job.videoUrl });
      }
      showToast("画中画已合成到视频");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "应用失败");
    } finally {
      setLoading("pip", false);
    }
  };

  return (
    <Panel
      step={step}
      title="画中画配置"
      badge="FFmpeg 合成"
      completed={pip.enabled && !!project.processedVideoUrl}
    >
      <Checkbox
        label="启用画中画"
        checked={pip.enabled}
        onChange={(v) => updatePip({ enabled: v })}
      />

      <div className="relative mx-auto aspect-[9/16] w-full max-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#0a0f18]">
        {mediaPreviewUrl ? (
          <video
            src={mediaPreviewUrl}
            className="size-full object-cover"
            muted
            playsInline
            controls
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[10px] text-[#7a8ba0]">
            主视频预览
          </div>
        )}
      </div>

      <FileUploadButton
        label={
          loading["pip-upload"]
            ? "上传中…"
            : "上传 B-roll 素材（视频或图片）"
        }
        accept="video/mp4,image/jpeg,image/png,image/webp,.mp4,.jpg,.png,.webp"
        disabled={loading["pip-upload"]}
        onSelect={handleUploadAsset}
      />

      <Select
        label="素材标签"
        value={pip.assetTag}
        onChange={(e) => updatePip({ assetTag: e.target.value })}
        options={PIP_ASSET_TAGS.map((tag) => ({ value: tag, label: tag }))}
      />

      <Select
        label="画中画位置"
        value={pip.position}
        onChange={(e) =>
          updatePip({ position: e.target.value as PipConfig["position"] })
        }
        options={PIP_POSITIONS.map((p) => ({
          value: p.value,
          label: p.label,
        }))}
      />

      <Slider
        label="缩放比例"
        value={pip.scale}
        min={0.15}
        max={0.6}
        step={0.05}
        onChange={(v) => updatePip({ scale: v })}
        format={(v) => `${Math.round(v * 100)}%`}
      />

      <Slider
        label="透明度"
        value={pip.opacity}
        min={0.3}
        max={1}
        step={0.05}
        onChange={(v) => updatePip({ opacity: v })}
        format={(v) => v.toFixed(2)}
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          label="开始时间 (秒)"
          type="number"
          value={pip.startSec}
          onChange={(e) => updatePip({ startSec: Number(e.target.value) })}
        />
        <Input
          label="持续时长 (秒)"
          type="number"
          value={pip.durationSec}
          onChange={(e) => updatePip({ durationSec: Number(e.target.value) })}
        />
      </div>

      <Slider
        label="圆角"
        value={pip.borderRadius}
        min={0}
        max={24}
        step={2}
        onChange={(v) => updatePip({ borderRadius: v })}
        format={(v) => `${v}px`}
      />

      <Button
        variant="primary"
        fullWidth
        onClick={handleApply}
        loading={loading.pip}
        disabled={!pip.enabled}
      >
        <Layers className="size-4" />
        应用画中画配置
      </Button>
    </Panel>
  );
}
