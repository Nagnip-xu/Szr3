import { Injectable, Logger } from '@nestjs/common';
import type { SubtitleSegment } from '../integrations/bailian/bailian.types';
import { DuixAsrService } from '../integrations/duix/duix-asr.service';
import { FfmpegService } from './ffmpeg.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class SubtitleAlignmentService {
  private readonly logger = new Logger(SubtitleAlignmentService.name);

  constructor(
    private readonly duixAsr: DuixAsrService,
    private readonly ffmpeg: FfmpegService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 按 TTS 实际音频重建字幕时间轴。
   * 文案以传入的 scriptText 为准（通常是改写后口播），ASR 只负责时间结构。
   */
  async alignFromAudio(
    organizationId: string,
    projectId: string,
    audioUrl: string,
    scriptText?: string,
  ): Promise<SubtitleSegment[]> {
    const saved = await this.storage.saveFromUrl(
      organizationId,
      projectId,
      'subtitle-align-source.mp3',
      audioUrl,
    );
    const durationMs = Math.round(
      (await this.ffmpeg.probeDurationSeconds(saved.filePath)) * 1000,
    );
    const script = this.normalizeScript(scriptText);
    let timingSegments: SubtitleSegment[] = [];

    if (this.duixAsr.isConfigured()) {
      try {
        const asr = await this.duixAsr.transcribeLocalFile(saved.filePath);
        timingSegments = this.normalizeSegments(asr.subtitleSegments, durationMs);
      } catch (err) {
        this.logger.warn(
          `TTS 音频 ASR 对齐失败，回退到按时长比例切分: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (script) {
      if (timingSegments.length > 0) {
        return this.applyScriptText(timingSegments, script, durationMs);
      }
      return this.buildProportionalSegments(script, durationMs);
    }

    return timingSegments;
  }

  normalizeSegments(
    segments: SubtitleSegment[],
    durationMs: number,
  ): SubtitleSegment[] {
    const cleaned = segments
      .map((segment) => ({
        beginMs: this.normalizeTimestampMs(segment.beginMs, durationMs),
        endMs: this.normalizeTimestampMs(segment.endMs, durationMs),
        text: segment.text?.trim() ?? '',
        words: segment.words,
      }))
      .filter((segment) => segment.text && segment.endMs > segment.beginMs);

    if (!cleaned.length) return [];

    const maxEnd = cleaned[cleaned.length - 1]?.endMs ?? 0;
    if (durationMs > 0 && maxEnd > durationMs * 1.25) {
      const scale = durationMs / maxEnd;
      return cleaned.map((segment) => ({
        ...segment,
        beginMs: Math.max(0, Math.round(segment.beginMs * scale)),
        endMs: Math.min(durationMs, Math.round(segment.endMs * scale)),
      }));
    }

    return cleaned;
  }

  applyScriptText(
    timingSegments: SubtitleSegment[],
    scriptText: string,
    durationMs: number,
  ): SubtitleSegment[] {
    const script = this.normalizeScript(scriptText);
    if (!script) return timingSegments;

    const chunks = this.splitScriptChunks(script);
    if (!timingSegments.length) {
      return this.buildProportionalSegments(script, durationMs);
    }

    if (chunks.length === timingSegments.length) {
      return timingSegments.map((segment, index) => ({
        beginMs: segment.beginMs,
        endMs: segment.endMs,
        text: chunks[index],
      }));
    }

    const weights = timingSegments.map((segment) =>
      Math.max(1, segment.endMs - segment.beginMs),
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const chars = [...script];
    let cursor = 0;

    return timingSegments.map((segment, index) => {
      const isLast = index === timingSegments.length - 1;
      const charCount = isLast
        ? chars.length - cursor
        : Math.max(1, Math.round((weights[index] / totalWeight) * chars.length));
      const text = chars.slice(cursor, cursor + charCount).join('');
      cursor += charCount;
      return {
        beginMs: segment.beginMs,
        endMs: segment.endMs,
        text: text || segment.text,
      };
    });
  }

  buildProportionalSegments(text: string, durationMs: number): SubtitleSegment[] {
    const script = this.normalizeScript(text);
    if (!script || durationMs <= 0) return [];

    const chunks = this.splitScriptChunks(script);
    const weights = chunks.map((part) => Math.max(1, part.length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    let cursor = 0;
    return chunks.map((part, index) => {
      const sliceMs =
        index === chunks.length - 1
          ? durationMs - cursor
          : Math.round((weights[index] / totalWeight) * durationMs);
      const beginMs = cursor;
      const endMs = Math.min(durationMs, cursor + Math.max(120, sliceMs));
      cursor = endMs;
      return { beginMs, endMs, text: part };
    });
  }

  private splitScriptChunks(script: string) {
    const parts = script
      .split(/(?<=[。！？；;,.!?])/u)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [script];
  }

  private normalizeScript(text?: string) {
    return text?.replace(/\s+/g, '').trim() ?? '';
  }

  private normalizeTimestampMs(value: number, durationMs: number): number {
    if (!Number.isFinite(value) || value < 0) return 0;
    const rounded = Math.round(value);

    // 部分 FunASR 构建返回秒，而不是毫秒。
    if (
      rounded > 0 &&
      rounded <= 600 &&
      durationMs > 5_000 &&
      rounded * 1000 <= durationMs * 1.25
    ) {
      return rounded * 1000;
    }

    return rounded;
  }
}
