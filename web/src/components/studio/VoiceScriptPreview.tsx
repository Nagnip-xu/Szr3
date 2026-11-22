"use client";

import { useProject } from "@/context/ProjectContext";
import { VOICE_OPTIONS } from "@/lib/api/mock-data";
import { Clock, FileText, Mic2 } from "lucide-react";

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** 中文口播粗略估算：约 4 字/秒，随语速缩放 */
function estimateDuration(chars: number, rate: number) {
  if (chars <= 0 || rate <= 0) return 0;
  return Math.max(1, Math.ceil(chars / (4 * rate)));
}

export function VoiceScriptPreview() {
  const { project } = useProject();
  const script =
    project.rewrittenScript?.trim() || project.originalScript?.trim() || "";
  const voice = VOICE_OPTIONS.find((v) => v.id === project.voiceId);
  const charCount = script.length;
  const estimatedSec = estimateDuration(charCount, project.speechRate);
  const hasAudio = !!project.audioUrl;

  return (
    <div className="flex min-h-[520px] flex-col rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 lg:sticky lg:top-[92px] lg:max-h-[calc(100vh-120px)]">
      <p className="text-sm font-medium text-[var(--foreground)]">配音文案</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
        以下内容将用于生成配音，可在「文案」步骤修改成稿
      </p>

      {voice && (
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[var(--accent-bright)]">
            <Mic2 className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">
              {voice.name}
            </p>
            <p className="truncate text-[11px] text-[var(--text-muted)]">{voice.tag}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]">
            {project.speechRate.toFixed(1)}x
          </span>
        </div>
      )}

      {script ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PreviewStat icon={FileText} label="字数" value={`${charCount} 字`} />
          <PreviewStat
            icon={Clock}
            label={hasAudio ? "实际时长" : "预估时长"}
            value={
              hasAudio && project.audioDuration
                ? formatTime(project.audioDuration)
                : `约 ${formatTime(estimatedSec)}`
            }
            highlight={hasAudio}
          />
        </dl>
      ) : null}

      <div
        className={`mt-4 flex flex-1 flex-col overflow-hidden rounded-[var(--radius-md)] border ${
          script
            ? "border-[var(--accent-ring)]/40 bg-[var(--accent-dim)]/20"
            : "border-[var(--border-subtle)] bg-[var(--surface-muted)]"
        }`}
      >
        <div className="flex-1 overflow-y-auto p-4">
          {script ? (
            <p className="whitespace-pre-wrap text-base leading-8 text-[var(--foreground)]">
              {script}
            </p>
          ) : (
            <p className="flex h-full min-h-[280px] items-center justify-center py-12 text-center text-sm leading-relaxed text-[var(--text-muted)]">
              请先在「文案」步骤
              <br />
              解析链接或执行仿写
            </p>
          )}
        </div>
      </div>

      {hasAudio && project.audioDuration && script && (
        <p className="mt-3 text-[11px] text-[var(--success)]">
          音频已生成 · 实际 {formatTime(project.audioDuration)}
          {Math.abs(project.audioDuration - estimatedSec) > 3 && (
            <span className="text-[var(--text-muted)]">
              {" "}
              （预估约 {formatTime(estimatedSec)}）
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function PreviewStat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-4 py-3">
      <Icon className="mb-1.5 size-4 text-[var(--text-muted)]" />
      <dt className="text-[11px] text-[var(--text-muted)]">{label}</dt>
      <dd
        className={`mt-1 text-base font-medium ${
          highlight ? "text-[var(--success)]" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
