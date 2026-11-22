import { Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import WebSocket from 'ws';
import { FfmpegService } from '../../media/ffmpeg.service';
import { DuixEndpointService } from './duix-endpoint.service';
import { AsrTranscriptionResult, DuixApiError } from './duix.types';
import type { SubtitleSegment } from '../bailian/bailian.types';

@Injectable()
export class DuixAsrService {
  constructor(
    private readonly ffmpeg: FfmpegService,
    private readonly endpoints: DuixEndpointService,
  ) {}

  private get wsUrl() {
    return this.endpoints.asrWsUrl();
  }

  isConfigured() {
    return !!this.wsUrl;
  }

  /**
   * FunASR WebSocket 离线识别（GPU duix-avatar-asr 容器）
   */
  async transcribeWithTimestamps(
    mediaUrl: string,
    localMediaPath?: string | null,
  ): Promise<AsrTranscriptionResult> {
    if (!this.isConfigured()) {
      throw new DuixApiError('未配置 DUIX_ASR_WS 或 DUIX_GPU_HOST');
    }

    await this.ffmpeg.ensureAvailable();

    let wavPath = localMediaPath ?? '';
    if (!wavPath || !(await this.fileExists(wavPath))) {
      throw new DuixApiError('无法定位 ASR 输入媒体文件');
    }

    const pcmPath = `${wavPath}.16k.pcm`;
    await this.ffmpeg.run([
      '-i',
      wavPath,
      '-ac',
      '1',
      '-ar',
      '16000',
      '-f',
      's16le',
      '-y',
      pcmPath,
    ]);

    const pcmBuffer = await this.readFileBuffer(pcmPath);
    const result = await this.transcribePcm(pcmBuffer);

    return {
      script: result.text,
      subtitleSegments: result.segments,
      durationMs: result.durationMs,
      model: 'heygem-fun-asr',
      hasWordTimestamps: result.segments.some((s) => (s.words?.length ?? 0) > 0),
    };
  }

  /** 从本地视频/音频文件转写（workflow 会先下载到 storage） */
  async transcribeLocalFile(localPath: string): Promise<AsrTranscriptionResult> {
    if (!this.isConfigured()) {
      throw new DuixApiError('未配置 DUIX_ASR_WS 或 DUIX_GPU_HOST');
    }

    await this.ffmpeg.ensureAvailable();
    const wavPath = `${localPath}.asr.wav`;
    await this.ffmpeg.run([
      '-i',
      localPath,
      '-ac',
      '1',
      '-ar',
      '16000',
      '-y',
      wavPath,
    ]);

    return this.transcribeWithTimestamps(wavPath, wavPath);
  }

  private async transcribePcm(pcmBuffer: Buffer) {
    const wsUrl = this.wsUrl;
    const chunkSize = 9600;
    let finalText = '';
    const segments: SubtitleSegment[] = [];
    let durationMs: number | undefined;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      let settled = false;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (idleTimer) clearTimeout(idleTimer);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve();
      };

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (idleTimer) clearTimeout(idleTimer);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(err);
      };

      const bumpIdle = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (finalText || segments.length) finish();
        }, 2000);
      };

      const timeout = setTimeout(() => {
        if (finalText || segments.length) finish();
        else fail(new DuixApiError('FunASR 识别超时'));
      }, 180_000);

      ws.on('open', () => {
        ws.send(
          JSON.stringify({
            mode: 'offline',
            chunk_size: [5, 10, 5],
            wav_name: 'szr3-asr',
            is_speaking: true,
            wav_format: 'pcm',
            chunk_interval: 10,
            itn: true,
          }),
        );

        for (let offset = 0; offset < pcmBuffer.length; offset += chunkSize) {
          ws.send(pcmBuffer.subarray(offset, offset + chunkSize));
        }

        ws.send(JSON.stringify({ is_speaking: false }));
      });

      ws.on('message', (data) => {
        try {
          const payload = JSON.parse(data.toString()) as {
            text?: string;
            is_final?: boolean;
            mode?: string;
            stamp_sents?: Array<{
              start?: number;
              end?: number;
              text_seg?: string;
              text?: string;
            }>;
          };

          if (payload.text) {
            finalText = payload.text.trim();
            bumpIdle();
          }

          if (payload.stamp_sents?.length) {
            for (const sent of payload.stamp_sents) {
              const text = (sent.text_seg ?? sent.text ?? '').replace(/\s+/g, '');
              if (!text) continue;
              segments.push({
                beginMs: sent.start ?? 0,
                endMs: sent.end ?? 0,
                text,
              });
            }
            const last = payload.stamp_sents[payload.stamp_sents.length - 1];
            if (last?.end) durationMs = last.end;
            bumpIdle();
          }

          if (payload.is_final) {
            finish();
          }
        } catch {
          /* ignore malformed frames */
        }
      });

      ws.on('error', (err) => {
        fail(new DuixApiError(`FunASR 连接失败: ${err.message}`));
      });

      ws.on('close', () => {
        if (settled) return;
        if (finalText || segments.length) finish();
        else fail(new DuixApiError('FunASR 未返回识别结果'));
      });
    });

    const script =
      finalText ||
      segments
        .map((s) => s.text)
        .filter(Boolean)
        .join('');

    if (!script) {
      throw new DuixApiError('FunASR 识别结果为空');
    }

    return { text: script, segments, durationMs };
  }

  private async fileExists(path: string) {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private readFileBuffer(path: string) {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      createReadStream(path)
        .on('data', (chunk: Buffer) => chunks.push(chunk))
        .on('error', reject)
        .on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
