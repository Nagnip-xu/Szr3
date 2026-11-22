import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DuixEndpointService } from './duix-endpoint.service';
import {
  DuixApiError,
  DuixVideoQueryResult,
  DuixVideoSubmitResult,
} from './duix.types';

@Injectable()
export class DuixVideoService {
  private get apiBase() {
    return this.endpoints.videoBaseUrl();
  }

  constructor(private readonly endpoints: DuixEndpointService) {}

  isConfigured() {
    return !!this.apiBase;
  }

  async submit(params: {
    audioFilename: string;
    videoFilename: string;
    taskCode?: string;
  }): Promise<DuixVideoSubmitResult> {
    if (!this.isConfigured()) {
      throw new DuixApiError('未配置 DUIX_VIDEO_API');
    }

    const code = params.taskCode ?? randomUUID();
    const res = await fetch(`${this.apiBase}/easy/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_url: params.audioFilename,
        video_url: params.videoFilename,
        code,
        chaofen: 0,
        watermark_switch: 0,
        pn: 1,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      code?: number;
      msg?: string;
      message?: string;
    };

    if (!res.ok) {
      throw new DuixApiError(
        body.msg ?? body.message ?? `HeyGem 视频任务提交失败 (${res.status})`,
        res.status,
      );
    }

    if (body.code !== undefined && body.code !== 10_000) {
      throw new DuixApiError(
        body.msg ?? body.message ?? `HeyGem 视频任务提交失败 (code=${body.code})`,
      );
    }

    return { taskCode: code };
  }

  async query(taskCode: string): Promise<DuixVideoQueryResult> {
    if (!this.isConfigured()) {
      throw new DuixApiError('未配置 DUIX_VIDEO_API');
    }

    const res = await fetch(
      `${this.apiBase}/easy/query?code=${encodeURIComponent(taskCode)}`,
    );

    const body = (await res.json().catch(() => ({}))) as {
      code?: number;
      msg?: string;
      data?: {
        status?: number;
        progress?: number;
        msg?: string;
        result?: string;
      };
    };

    if (!res.ok) {
      throw new DuixApiError(
        body.msg ?? `HeyGem 任务查询失败 (${res.status})`,
        res.status,
      );
    }

    if ([9999, 10_002, 10_003].includes(body.code ?? 0)) {
      return {
        status: 'failed',
        message: body.msg ?? 'HeyGem 视频生成失败',
      };
    }

    if (body.code !== 10_000 || !body.data) {
      return {
        status: 'failed',
        message: body.msg ?? 'HeyGem 返回异常',
      };
    }

    const dataStatus = body.data.status;
    if (dataStatus === 1) {
      return {
        status: 'processing',
        progress: body.data.progress,
        message: body.data.msg,
      };
    }
    if (dataStatus === 2) {
      return {
        status: 'success',
        progress: 100,
        message: body.data.msg,
        resultPath: body.data.result,
      };
    }
    if (dataStatus === 3) {
      return {
        status: 'failed',
        message: body.data.msg ?? 'HeyGem 视频生成失败',
      };
    }

    return { status: 'pending', message: body.data.msg };
  }

  async waitForResult(
    taskCode: string,
    options?: {
      maxAttempts?: number;
      intervalMs?: number;
      onProgress?: (progress: number, message?: string) => Promise<void>;
    },
  ) {
    const maxAttempts = options?.maxAttempts ?? 600;
    const intervalMs = options?.intervalMs ?? 3000;
    let lastProgress = -1;
    let lastProgressAt = Date.now();

    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.query(taskCode);
      if (result.status === 'success' && result.resultPath) {
        return result;
      }
      if (result.status === 'failed') {
        throw new DuixApiError(result.message ?? 'HeyGem 视频生成失败');
      }
      const heygemProgress = result.progress ?? 0;
      if (heygemProgress !== lastProgress) {
        lastProgress = heygemProgress;
        lastProgressAt = Date.now();
      } else if (
        heygemProgress <= 5 &&
        Date.now() - lastProgressAt >= 90_000
      ) {
        throw new DuixApiError(
          'Duix-Avatar GPU 工作进程未真正开始推理（进度停在 5%）。容器已可能丢失 GPU，请稍后重试。',
        );
      }
      if (options?.onProgress) {
        const progress =
          heygemProgress > 0
            ? Math.min(95, Math.max(5, heygemProgress))
            : Math.min(95, Math.round(((i + 1) / maxAttempts) * 90) + 5);
        await options.onProgress(progress, result.message);
      }
      await this.sleep(i === 0 ? 2000 : intervalMs);
    }

    throw new DuixApiError('HeyGem 视频生成超时，请稍后重试');
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
