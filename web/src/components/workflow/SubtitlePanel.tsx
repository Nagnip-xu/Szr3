"use client";

import { api } from "@/lib/api/client";
import { pollRenderJob } from "@/lib/api/render-jobs";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import {
  ColorInput,
  Input,
  Select,
} from "@/components/ui/FormControls";
import { Subtitles } from "lucide-react";
import { formatMs } from "@/lib/types/subtitle";

export function SubtitlePanel({ step }: { step?: number }) {
  const { project, updateProject, loading, setLoading, showToast } =
    useProject();

  const videoUrl =
    project.processedVideoUrl ??
    project.digitalHumanVideoUrl ??
    project.parsedVideoUrl;

  const handleGenerate = async () => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建项目");
      return;
    }
    if (!videoUrl) {
      showToast("请先生成数字人视频或解析视频链接");
      return;
    }
    setLoading("subtitle", true);
    try {
      const res = await api.generateSubtitles({
        projectId: project.projectId,
        videoUrl,
        script: project.rewrittenScript || project.originalScript,
        subtitleSegments: project.subtitleSegments,
        audioUrl: project.audioUrl,
        style: {
          font: project.subtitleFont,
          size: project.subtitleSize,
          bottom: project.subtitleBottom,
          color: project.subtitleColor,
          strokeColor: project.subtitleStrokeColor,
        },
      });
      if (!res.success || !res.data?.jobId) {
        showToast(res.message ?? "字幕任务提交失败");
        return;
      }
      showToast("字幕烧录中，请稍候…");
      const job = await pollRenderJob(res.data.jobId);
      if (job.status === "failed") {
        showToast(job.error ?? "字幕烧录失败");
        return;
      }
      if (job.videoUrl) {
        updateProject({
          processedVideoUrl: job.videoUrl,
          digitalHumanVideoUrl: job.videoUrl,
        });
      }
      showToast("字幕烧录完成");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "字幕烧录失败");
    } finally {
      setLoading("subtitle", false);
    }
  };

  return (
    <Panel step={step} title="字幕与后期">
      <Select
        label="字体"
        value={project.subtitleFont}
        onChange={(e) => updateProject({ subtitleFont: e.target.value })}
        options={[
          { value: "AlibabaPuHuiTi_2_105_Heavy", label: "AlibabaPuHuiTi Heavy" },
          { value: "AlimamaShuHeiTi", label: "AlimamaShuHeiTi" },
          { value: "SourceHanSans", label: "思源黑体" },
        ]}
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          label="字号"
          type="number"
          value={project.subtitleSize}
          onChange={(e) =>
            updateProject({ subtitleSize: Number(e.target.value) })
          }
        />
        <Input
          label="底部距离 (px)"
          type="number"
          value={project.subtitleBottom}
          onChange={(e) =>
            updateProject({ subtitleBottom: Number(e.target.value) })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="字体颜色"
          value={project.subtitleColor}
          onChange={(v) => updateProject({ subtitleColor: v })}
        />
        <ColorInput
          label="描边颜色"
          value={project.subtitleStrokeColor}
          onChange={(v) => updateProject({ subtitleStrokeColor: v })}
        />
      </div>

      {project.subtitleSegments.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-[#0a0f18]/50 p-3">
          <p className="text-xs text-[#8b9cb3]">
            已加载 {project.subtitleSegments.length} 条 ASR 时间轴
            {project.hasWordTimestamps ? "（字级）" : ""}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[#5a6a82]">
            {formatMs(project.subtitleSegments[0].beginMs)} —{" "}
            {formatMs(
              project.subtitleSegments[project.subtitleSegments.length - 1]
                .endMs,
            )}
          </p>
        </div>
      )}

      <Button
        variant="primary"
        fullWidth
        onClick={handleGenerate}
        loading={loading.subtitle}
      >
        <Subtitles className="size-4" />
        烧录字幕到视频
      </Button>
    </Panel>
  );
}
