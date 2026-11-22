"use client";

import { cn } from "@/lib/utils";
import { isVideoMediaUrl, withAuthToken } from "@/lib/api/media-url";
import { Pause, Play, RotateCcw, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface PreviewFrameMetrics {
  frameWidth: number;
  frameHeight: number;
  videoWidth: number;
  videoHeight: number;
}

interface VideoPreviewFrameProps {
  src?: string | null;
  emptyHint?: string;
  className?: string;
  overlay?: React.ReactNode;
  onPlaybackTimeChange?: (seconds: number) => void;
  onFrameMetrics?: (metrics: PreviewFrameMetrics) => void;
}

export function VideoPreviewFrame(props: VideoPreviewFrameProps) {  return <VideoPreviewFrameContent key={withAuthToken(props.src)} {...props} />;}function VideoPreviewFrameContent({
  src,
  emptyHint = "暂无预览",
  className,
  overlay,
  onPlaybackTimeChange,
  onFrameMetrics,
}: VideoPreviewFrameProps) {
  const mediaSrc = withAuthToken(src);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const retryCountRef = useRef(0);
  const [playingSrc, setPlayingSrc] = useState<string | undefined>();
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const [videoSize, setVideoSize] = useState({ width: 720, height: 1280 });
  const isPlaying = playingSrc === mediaSrc;
  const hasError = failedSrc === mediaSrc;

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !onFrameMetrics) return;

    const publish = () => {
      onFrameMetrics({
        frameWidth: node.clientWidth,
        frameHeight: node.clientHeight,
        videoWidth: videoSize.width,
        videoHeight: videoSize.height,
      });
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onFrameMetrics, videoSize.width, videoSize.height]);

  const markLoadFailure = () => {
    const video = videoRef.current;
    if (video && retryCountRef.current < 2) {
      retryCountRef.current += 1;
      video.load();
      return;
    }
    setFailedSrc(mediaSrc);
  };

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.ended) video.currentTime = 0;
    if (video.paused) await video.play().catch(() => markLoadFailure());
    else video.pause();
  };

  const restart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => markLoadFailure());
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[9/16] overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-muted)] [container-type:size]",
        className,
      )}
    >
      {mediaSrc ? (
        isVideoMediaUrl(mediaSrc) ? (
          <video
            key={mediaSrc}
            ref={videoRef}
            src={mediaSrc}
            className="size-full object-cover"
            playsInline
            muted
            preload="metadata"
            onPlay={() => setPlayingSrc(mediaSrc)}
            onPause={() => setPlayingSrc(undefined)}
            onEnded={() => setPlayingSrc(undefined)}
            onError={() => markLoadFailure()}
            onLoadedMetadata={(event) => {
              const target = event.currentTarget;
              if (target.videoWidth > 0 && target.videoHeight > 0) {
                setVideoSize({
                  width: target.videoWidth,
                  height: target.videoHeight,
                });
              }
              onPlaybackTimeChange?.(target.currentTime);
            }}
            onTimeUpdate={(event) => onPlaybackTimeChange?.(event.currentTarget.currentTime)}
            onSeeking={(event) => onPlaybackTimeChange?.(event.currentTarget.currentTime)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element          <img src={mediaSrc} alt="预览" className="size-full object-cover" />
        )
      ) : (
        <div className="flex size-full items-center justify-center px-4 text-center text-xs leading-relaxed text-[var(--text-muted)]">
          {emptyHint}
        </div>
      )}
      {overlay}
      {mediaSrc && isVideoMediaUrl(mediaSrc) && !hasError && (
        <div className="absolute right-2 top-2 flex gap-1.5">
          <button type="button" onClick={togglePlayback} className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-black/65 text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition hover:bg-black/80" aria-label={isPlaying ? "暂停预览" : "播放预览"}>
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
          <button type="button" onClick={restart} className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-black/65 text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition hover:bg-black/80" aria-label="从头播放">
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      )}
      {mediaSrc && isVideoMediaUrl(mediaSrc) && !hasError && (
        <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-black/55 px-2 py-1 text-[10px] text-white/90"><VolumeX className="size-3" />静音预览</div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--surface-muted)] px-5 text-center text-xs leading-relaxed text-[var(--text-muted)]">
          <p>视频无法加载。请刷新登录状态后重试，或重新生成该视频。</p>
          <button
            type="button"
            onClick={() => {
              retryCountRef.current = 0;
              setFailedSrc(undefined);
              videoRef.current?.load();
            }}
            className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-[11px] text-[var(--foreground)] transition hover:bg-white/5"
          >
            重试加载
          </button>
        </div>
      )}
    </div>
  );
}
