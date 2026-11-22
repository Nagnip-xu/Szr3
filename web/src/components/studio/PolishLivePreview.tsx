"use client";

import { useProject } from "@/context/ProjectContext";
import {
  VideoPreviewFrame,
  type PreviewFrameMetrics,
} from "@/components/studio/VideoPreviewFrame";
import {
  previewSubtitleMetrics,
  resolveSubtitleStyle,
} from "@/lib/subtitle-style";
import { useMemo, useState } from "react";

interface PolishLivePreviewProps {
  mode: "subtitle" | "bgm" | "pip" | "title";
  compact?: boolean;
}

/** 预览与 ASS 烧录共用：字号 = max(28, size×6)，按视频分辨率等比缩放 */
export function PolishLivePreview({ mode, compact = false }: PolishLivePreviewProps) {
  const { project } = useProject();
  const [playbackTime, setPlaybackTime] = useState(0);
  const [frameMetrics, setFrameMetrics] = useState<PreviewFrameMetrics>({
    frameWidth: 260,
    frameHeight: 462,
    videoWidth: 720,
    videoHeight: 1280,
  });

  const videoUrl =
    project.processedVideoUrl ??
    project.digitalHumanVideoUrl ??
    project.parsedVideoUrl;

  const segments = project.subtitleSegments;
  const sampleLines = useMemo(() => {
    if (segments.length > 0) {
      return segments.slice(0, 8).map((s) => s.text);
    }
    const script = project.rewrittenScript || project.originalScript;
    if (!script) return ["字幕预览文案"];
    return script
      .split(/[。！？\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [segments, project.rewrittenScript, project.originalScript]);

  const activeSegment = segments.find(
    (segment) =>
      playbackTime * 1000 >= segment.beginMs &&
      playbackTime * 1000 < segment.endMs,
  );
  const activeLine =
    segments.length > 0
      ? (activeSegment?.text ?? "")
      : sampleLines[Math.floor(playbackTime / 2.8) % sampleLines.length] ?? "";

  const resolvedStyle = resolveSubtitleStyle(
    project.subtitleSize,
    project.subtitleBottom,
    {
      x: frameMetrics.videoWidth,
      y: frameMetrics.videoHeight,
    },
  );
  const previewMetrics = previewSubtitleMetrics(
    resolvedStyle,
    frameMetrics.frameHeight,
  );

  const subtitleOverlay =
    mode === "subtitle" ? (
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center px-3"
        style={{ bottom: previewMetrics.bottomPx }}
      >
        <p
          className="max-w-full text-center leading-none break-words"
          style={{
            fontSize: previewMetrics.fontSizePx,
            fontFamily: "'Noto Sans CJK SC', sans-serif",
            fontWeight: 400,
            color: project.subtitleColor,
            WebkitTextStroke: `${previewMetrics.outlinePx}px ${project.subtitleStrokeColor}`,
            paintOrder: "stroke fill",
          }}
        >
          {activeLine}
        </p>
      </div>
    ) : mode === "title" ? (
      <div className="pointer-events-none absolute inset-x-0 top-8 px-4 text-center">
        <p className="text-lg font-bold text-white drop-shadow-lg">
          {project.title || "发布标题预览"}
        </p>
        {project.hashtags && (
          <p className="mt-2 text-xs text-white/80">{project.hashtags}</p>
        )}
      </div>
    ) : mode === "bgm" ? (
      <div className="pointer-events-none absolute inset-x-0 bottom-4 px-4">
        <div className="rounded-[var(--radius-md)] bg-black/50 px-3 py-2 text-center text-[11px] text-white/90 backdrop-blur-sm">
          配乐音量 {Math.round(project.bgmVolume * 100)}%
          {project.useBgm ? "" : " · 已关闭"}
        </div>
      </div>
    ) : (
      <div className="pointer-events-none absolute inset-x-0 bottom-4 px-4">
        <div className="rounded-[var(--radius-md)] bg-black/50 px-3 py-2 text-center text-[11px] text-white/90 backdrop-blur-sm">
          {project.pip.enabled ? "画中画已启用" : "画中画未启用"}
        </div>
      </div>
    );

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 lg:sticky lg:top-[92px]">
      <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">实时预览</p>
      <p className="mb-3 text-[11px] text-[var(--text-muted)]">
        {mode === "subtitle"
          ? "预览按成片 ASS 规则渲染，与烧录结果一致"
          : mode === "title"
            ? "标题与标签叠加效果"
            : "当前包装设置示意"}
      </p>
      <VideoPreviewFrame
        src={videoUrl}
        className={compact ? "mx-auto max-w-[260px]" : undefined}
        onPlaybackTimeChange={setPlaybackTime}
        onFrameMetrics={setFrameMetrics}
        emptyHint="请先生成数字人视频"
        overlay={subtitleOverlay}
      />
      {mode === "subtitle" && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
          <div>
            <dt>字号</dt>
            <dd className="text-[var(--foreground)]">{resolvedStyle.uiSize}</dd>
          </div>
          <div>
            <dt>距底</dt>
            <dd className="text-[var(--foreground)]">{resolvedStyle.uiBottom}px</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
