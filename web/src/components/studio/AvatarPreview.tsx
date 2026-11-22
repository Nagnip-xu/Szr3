"use client";

import { useProject } from "@/context/ProjectContext";
import { useWorkflowOptions } from "@/hooks/useWorkflowOptions";
import { VideoPreviewFrame } from "@/components/studio/VideoPreviewFrame";
import { isVideoMediaUrl, withAuthToken } from "@/lib/api/media-url";

export function AvatarPreview() {
  const { project } = useProject();
  const { avatars } = useWorkflowOptions();
  const selected = avatars.find((a) => a.id === project.avatarId);
  const isCustom = project.avatarId.startsWith("custom-");

  const refVideo = isCustom
    ? (project.referenceVideoUrl ?? selected?.referenceVideo ?? null)
    : (selected?.previewVideo ?? selected?.referenceVideo ?? null);
  const refWithAuth = withAuthToken(refVideo);

  const dhMatchesAvatar =
    !!project.digitalHumanVideoUrl &&
    !!project.avatarId &&
    project.digitalHumanAvatarId === project.avatarId;

  const url =
    (dhMatchesAvatar ? withAuthToken(project.digitalHumanVideoUrl) : null) ??
    (refWithAuth && isVideoMediaUrl(refWithAuth) ? refWithAuth : null) ??
    null;

  const hint = dhMatchesAvatar
    ? "数字人对口型成片"
    : isCustom && refVideo
      ? `${selected?.name ?? "我的数字人"} · 参考口播（生成后替换为对口型成片）`
      : "请先上传并保存数字人，双击卡片可放大播放";

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 lg:sticky lg:top-[92px]">
      <p className="mb-3 text-xs font-medium text-[var(--text-muted)]">预览</p>
      <VideoPreviewFrame src={url} emptyHint={hint} />
    </div>
  );
}
