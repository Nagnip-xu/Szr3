"use client";

import { api } from "@/lib/api/client";
import { pollRenderJob } from "@/lib/api/render-jobs";
import { useProject } from "@/context/ProjectContext";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Checkbox, Slider } from "@/components/ui/FormControls";
import { Music } from "lucide-react";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { uploadProjectFile } from "@/lib/api/upload";

export function BgmPanel({ step }: { step?: number }) {
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
      showToast("请先生成数字人视频");
      return;
    }
    setLoading("bgm", true);
    try {
      const res = await api.generateBgm({
        projectId: project.projectId,
        videoUrl,
        volume: project.bgmVolume,
        bgmUrl: project.bgmUrl,
      });
      if (!res.success || !res.data?.jobId) {
        showToast(res.message ?? "BGM 任务提交失败");
        return;
      }
      showToast("BGM 混音中，请稍候…");
      const job = await pollRenderJob(res.data.jobId);
      if (job.status === "failed") {
        showToast(job.error ?? "BGM 混音失败");
        return;
      }
      if (job.videoUrl) {
        updateProject({
          processedVideoUrl: job.videoUrl,
          digitalHumanVideoUrl: job.videoUrl,
        });
      }
      showToast(
        project.bgmUrl ? "BGM 混音完成" : "未上传 BGM，已跳过混音并复制视频",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "BGM 混音失败");
    } finally {
      setLoading("bgm", false);
    }
  };

  return (
    <Panel step={step} title="背景音乐混音">
      <Slider
        label="BGM 音量"
        value={project.bgmVolume}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => updateProject({ bgmVolume: v })}
        format={(v) => v.toFixed(2)}
      />

      <Button
        variant="primary"
        fullWidth
        onClick={handleGenerate}
        loading={loading.bgm}
        disabled={!project.useBgm}
      >
        <Music className="size-4" />
        混音 BGM 到视频
      </Button>

      <div className="space-y-2 border-t border-white/[0.06] pt-3">
        <Checkbox
          label="自定义 BGM（填写音频 URL）"
          checked={project.customBgm}
          onChange={(v) => updateProject({ customBgm: v })}
        />
        {project.customBgm && (
          <>
            <FileUploadButton
              label={loading["bgm-upload"] ? "上传中…" : "上传 BGM 音频文件"}
              accept="audio/mpeg,audio/wav,.mp3,.wav"
              disabled={loading["bgm-upload"]}
              onSelect={async (file) => {
                if (!project.projectId) {
                  showToast("请先在「创作空间」创建项目");
                  return;
                }
                setLoading("bgm-upload", true);
                try {
                  const uploaded = await uploadProjectFile(
                    project.projectId,
                    file,
                  );
                  updateProject({ bgmUrl: uploaded.publicUrl, customBgm: true });
                  showToast("BGM 已上传");
                } catch (err) {
                  showToast(err instanceof Error ? err.message : "上传失败");
                } finally {
                  setLoading("bgm-upload", false);
                }
              }}
            />
            <input
              type="url"
              placeholder="或粘贴 BGM 音频链接（mp3）"
              value={project.bgmUrl ?? ""}
              onChange={(e) => updateProject({ bgmUrl: e.target.value || null })}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f18] px-3 py-2 text-sm text-[#e8edf5] outline-none focus:border-[#3b82f6]/40"
            />
          </>
        )}
        <Checkbox
          label="不使用 BGM"
          checked={!project.useBgm}
          onChange={(v) => updateProject({ useBgm: !v })}
        />
      </div>
    </Panel>
  );
}
