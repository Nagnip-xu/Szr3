"use client";

import { api, complianceApi } from "@/lib/api/client";
import { pollRenderJob } from "@/lib/api/render-jobs";
import { uploadProjectFile } from "@/lib/api/upload";
import { useWorkflowOptions } from "@/hooks/useWorkflowOptions";
import { useProject } from "@/context/ProjectContext";
import { AvatarPicker } from "@/components/workflow/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Panel } from "@/components/ui/Panel";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { Checkbox } from "@/components/ui/FormControls";
import { ChevronDown, FolderOpen } from "lucide-react";
import { useState } from "react";
import type { AvatarOption } from "@/lib/types/project";
import { hasDigitalHumanOutput } from "@/lib/types/project";

export function VideoPanel() {
  const { project, updateProject, loading, setLoading, showToast } =
    useProject();
  const { avatars, refresh } = useWorkflowOptions();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progressHint, setProgressHint] = useState("");
  const [avatarRefUrl, setAvatarRefUrl] = useState<string | null>(null);
  const [avatarRefName, setAvatarRefName] = useState("我的数字人");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarConsent, setAvatarConsent] = useState(false);
  const [avatarConsentId, setAvatarConsentId] = useState<string | null>(null);
  const [avatarToDelete, setAvatarToDelete] = useState<
    (AvatarOption & { tag?: string; referenceVideo?: string }) | null
  >(null);
  const [deletingAvatar, setDeletingAvatar] = useState(false);

  const selectedAvatar = avatars.find((a) => a.id === project.avatarId);
  const isCustomAvatar = project.avatarId.startsWith("custom-");

  const handleSelectAvatar = (
    avatar: AvatarOption & { tag?: string; referenceVideo?: string },
  ) => {
    updateProject({
      avatarId: avatar.id,
      referenceVideoUrl: avatar.referenceVideo ?? null,
      digitalHumanVideoUrl: null,
      digitalHumanAvatarId: null,
    });
  };

  const handleUploadAvatarRef = async (file: File) => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建或打开项目");
      return;
    }
    if (!avatarConsent) {
      showToast("请先确认您已获得肖像和声音使用授权");
      return;
    }
    setLoading("upload-ref", true);
    try {
      const consent = await complianceApi.createConsent({ projectId: project.projectId, type: "avatar_clone", subjectName: avatarRefName.trim() || undefined });
      const uploaded = await uploadProjectFile(project.projectId, file);
      setAvatarRefUrl(uploaded.publicUrl);
      setAvatarConsentId(consent.id);
      showToast("参考视频已上传，可保存为我的数字人");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "上传失败");
    } finally {
      setLoading("upload-ref", false);
    }
  };

  const handleSaveCustomAvatar = async () => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建项目");
      return;
    }
    if (!avatarRefUrl || !avatarConsentId) {
      showToast("请先上传 5–30 秒正脸口播参考视频");
      return;
    }
    setSavingAvatar(true);
    const res = await api.saveCustomAvatar({
      projectId: project.projectId,
      videoUrl: avatarRefUrl,
      consentId: avatarConsentId,
      name: avatarRefName.trim() || "我的数字人",
    });
    setSavingAvatar(false);
    if (res.success && res.data) {
      updateProject({
        avatarId: res.data.id,
        referenceVideoUrl: res.data.referenceVideo,
        digitalHumanVideoUrl: null,
        digitalHumanAvatarId: null,
      });
      refresh();
      showToast(`数字人「${res.data.name}」已保存并选中`);
    } else {
      showToast(res.message ?? "保存失败");
    }
  };

  const handleDeleteAvatar = async () => {
    if (!avatarToDelete) return;

    setDeletingAvatar(true);
    const res = await api.deleteCustomAvatar(avatarToDelete.id);
    setDeletingAvatar(false);

    if (res.success) {
      if (project.avatarId === avatarToDelete.id) {
        updateProject({
          avatarId: "",
          referenceVideoUrl: null,
          digitalHumanVideoUrl: null,
          digitalHumanAvatarId: null,
        });
      }
      setAvatarToDelete(null);
      refresh();
      showToast(`数字人「${avatarToDelete.name}」已删除`);
    } else {
      showToast(res.message ?? "删除失败");
    }
  };

  const handleGenerate = async () => {
    if (!project.projectId) {
      showToast("请先在「创作空间」创建或打开项目");
      return;
    }
    if (!project.audioUrl) {
      showToast("请先生成音频");
      return;
    }
    if (!isCustomAvatar && !selectedAvatar?.referenceVideo) {
      showToast("请先选择或上传数字人参考视频");
      return;
    }
    const referenceVideoUrl = project.referenceVideoUrl ?? undefined;

    if (!referenceVideoUrl) {
      showToast("请先上传并保存自定义数字人");
      return;
    }

    setLoading("video", true);
    setProgressHint("提交 Duix-Avatar / HeyGem 数字人任务…");
    try {
      const res = await api.generateDigitalHuman({
        projectId: project.projectId,
        avatarId: project.avatarId,
        audioUrl: project.audioUrl,
        referenceVideoUrl,
      });
      if (!res.success || !res.data?.jobId) {
        showToast(res.message ?? "数字人任务提交失败");
        return;
      }
      showToast("数字人生成中，请稍候…");
      let lastProgress = -1;
      let lastProgressAt = Date.now();
      const job = await pollRenderJob(res.data.jobId, {
        intervalMs: 5000,
        timeoutMs: 3_600_000,
        onProgress: (p) => {
          if (p.progress !== lastProgress) {
            lastProgress = p.progress;
            lastProgressAt = Date.now();
          }
          const stuckMs = Date.now() - lastProgressAt;
          const etaHint =
            p.progress < 20
              ? "（约 3–10 分钟，取决于 GPU 负载）"
              : "";
          const stuckHint =
            stuckMs >= 180_000
              ? " · 进度长时间未动，可取消后重新点击生成"
              : "";
          setProgressHint(`生成进度 ${p.progress}%${etaHint}${stuckHint}`);
        },
      });
      if (job.status === "failed") {
        showToast(job.error ?? "数字人生成失败");
        return;
      }
      if (job.videoUrl) {
        updateProject({
          digitalHumanVideoUrl: job.videoUrl,
          digitalHumanAvatarId: project.avatarId,
        });
      }
      showToast("数字人视频生成成功");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "数字人生成失败");
    } finally {
      setLoading("video", false);
      setProgressHint("");
    }
  };

  return (
    <Panel step={4} title="数字人生成" completed={hasDigitalHumanOutput(project)}>
      <div className="space-y-2 rounded-lg border border-white/[0.08] bg-[#0a0f18]/40 p-3">
        <p className="text-xs font-medium text-[#9eb0c8]">上传数字人参考视频</p>
        <p className="text-[11px] leading-relaxed text-[#5a6a82]">
          上传 5–30 秒正脸口播参考视频（mp4/mov），保存后可重复使用。Duix-Avatar
          将用该视频里的人脸 + 你的配音生成对口型成片。
        </p>
        <input
          type="text"
          value={avatarRefName}
          onChange={(e) => setAvatarRefName(e.target.value)}
          placeholder="数字人名称"
          className="w-full rounded-md border border-white/10 bg-[#141c2b] px-3 py-2 text-xs text-[#c8d4e4] outline-none focus:border-[#3b82f6]/50"
        />
        <Checkbox
          id="avatar-clone-consent"
          checked={avatarConsent}
          onChange={setAvatarConsent}
          label="我确认已获得视频中人物的肖像、声音及数字人驱动授权。"
        />
        <FileUploadButton
          label={
            avatarRefUrl ? "重新上传参考视频" : "上传参考口播视频"
          }
          accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
          disabled={loading["upload-ref"] || savingAvatar}
          onSelect={handleUploadAvatarRef}
        />
        <Button
          variant="secondary"
          fullWidth
          onClick={handleSaveCustomAvatar}
          loading={savingAvatar}
          disabled={!avatarRefUrl || loading["upload-ref"]}
        >
          保存为我的数字人
        </Button>
      </div>

      <AvatarPicker
        avatars={avatars}
        value={project.avatarId}
        onChange={handleSelectAvatar}
        onDelete={setAvatarToDelete}
      />

      {selectedAvatar && (
        <p className="text-center text-[11px] text-[#5a6a82]">
          当前：{selectedAvatar.name}
          {selectedAvatar.tag ? ` · ${selectedAvatar.tag}` : ""}
          {isCustomAvatar && " · 双击卡片可放大播放参考视频"}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-[#0a0f18]/40 px-3 py-2 text-xs text-[#8b9cb3] hover:text-[#c8d4e8]"
      >
        高级参数设置
        <ChevronDown
          className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
        />
      </button>

      {showAdvanced && (
        <div className="space-y-2 rounded-lg border border-white/[0.06] bg-[#0a0f18]/40 p-3 text-xs text-[#5a6a82]">
          <p>
            流程：文案 → 配音（TTS）→ 参考口播视频 + 音频 → Duix-Avatar
            对口型成片。
          </p>
          <p>
            后端对接 GitHub 开源项目 duixcom/Duix-Avatar（GPU 容器 :8383
            视频 / :18180 TTS / :10095 ASR）。
          </p>
        </div>
      )}

      {progressHint && (
        <p className="text-center text-xs text-[#7eb8ff]">{progressHint}</p>
      )}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleGenerate}
        loading={loading.video}
      >
        生成数字人视频
      </Button>

      <Button variant="ghost" size="sm" fullWidth disabled>
        <FolderOpen className="size-3.5" />
        成片保存在项目 storage 目录
      </Button>

      <ConfirmDialog
        open={!!avatarToDelete}
        onClose={() => setAvatarToDelete(null)}
        onConfirm={handleDeleteAvatar}
        title="删除这个数字人？"
        description={
          avatarToDelete ? (
            <>
              将从「我的数字人」中移除
              <span className="font-medium text-[var(--foreground)]">
                「{avatarToDelete.name}」
              </span>
              。已生成的视频不会受影响。
            </>
          ) : undefined
        }
        confirmLabel="删除数字人"
        loading={deletingAvatar}
        variant="danger"
      />
    </Panel>
  );
}
