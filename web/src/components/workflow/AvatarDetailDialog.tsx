"use client";

import { Dialog } from "@/components/ui/Dialog";
import { isVideoMediaUrl, withAuthToken } from "@/lib/api/media-url";
import type { AvatarOption } from "@/lib/types/project";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AvatarDetailDialogProps {
  avatar: (AvatarOption & { tag?: string; referenceVideo?: string }) | null;
  open: boolean;
  onClose: () => void;
}

export function AvatarDetailDialog({
  avatar,
  open,
  onClose,
}: AvatarDetailDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [buffering, setBuffering] = useState(true);

  const videoSource = avatar?.id.startsWith("custom-")
    ? avatar.referenceVideo
    : (avatar?.previewVideo ?? avatar?.referenceVideo);
  const videoUrl = avatar
    ? withAuthToken(videoSource)
    : undefined;
  const posterUrl = avatar?.preview
    ? (withAuthToken(avatar.preview) ?? avatar.preview)
    : undefined;
  const canPlayVideo = !!videoUrl && isVideoMediaUrl(videoUrl);

  useEffect(() => {
    if (!open) return;
    const el = videoRef.current;
    if (!el || !canPlayVideo) return;

    setBuffering(true);
    const onReady = () => setBuffering(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);

    el.addEventListener("loadeddata", onReady);
    el.addEventListener("canplay", onReady);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);

    el.load();

    return () => {
      el.removeEventListener("loadeddata", onReady);
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      el.pause();
    };
  }, [open, canPlayVideo, videoUrl]);

  if (!avatar) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      showClose
      ariaLabel={`${avatar.name} 参考口播视频`}
      className="flex max-h-[min(72vh,520px)] w-[min(15rem,86vw,calc((72vh-5.5rem)*9/16))] max-w-none flex-col overflow-hidden p-0"
    >
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-3 py-2 pr-10">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">
          {avatar.name}
        </p>
        {avatar.tag && (
          <p className="truncate text-[11px] text-[var(--text-muted)]">
            {avatar.tag}
          </p>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {canPlayVideo ? (
          <>
            {posterUrl && buffering && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            )}
            {buffering && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/35">
                <Loader2 className="size-6 animate-spin text-white/80" />
                <span className="text-[11px] text-white/70">加载视频中…</span>
              </div>
            )}
            <video
              ref={videoRef}
              key={videoUrl}
              src={videoUrl}
              poster={posterUrl}
              className="absolute inset-0 size-full object-cover"
              controls
              autoPlay
              muted
              playsInline
              preload="metadata"
            />
          </>
        ) : (
          <div className="flex size-full items-center justify-center px-4 text-center text-xs text-[var(--text-muted)]">
            暂无参考口播视频
          </div>
        )}
      </div>

      <p className="shrink-0 px-3 py-1.5 text-center text-[10px] leading-relaxed text-[var(--text-muted)]">
        参考口播 · 生成时用该人脸 + 配音对口型
      </p>
    </Dialog>
  );
}
