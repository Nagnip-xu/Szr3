import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { VideoRenderService } from '../media/video-render.service';
import { DigitalHumanService } from '../media/digital-human.service';

export type RenderJobType =
  | 'subtitle'
  | 'bgm'
  | 'final'
  | 'digital-human'
  | 'pip'
  | 'cover';

export interface RenderJobPayload {
  jobId: string;
  type: RenderJobType;
  organizationId: string;
  projectId: string;
  userId: string;
  input: Record<string, unknown>;
}

@Injectable()
export class RenderQueueService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue<RenderJobPayload> | null = null;
  private worker: Worker<RenderJobPayload> | null = null;
  private redis: IORedis | null = null;
  private readonly localPending = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoRender: VideoRenderService,
    private readonly digitalHuman: DigitalHumanService,
  ) {}

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      void this.recoverInterruptedJobs();
      return;
    }

    this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<RenderJobPayload>('szr3-render', {
      connection: this.redis,
    });

    this.worker = new Worker<RenderJobPayload>(
      'szr3-render',
      async (job) => this.executeJob(job.data),
      { connection: this.redis, concurrency: 1 },
    );
    void this.recoverInterruptedJobs();
  }

  private async recoverInterruptedJobs() {
    const jobs = await this.prisma.renderJob.findMany({
      where: { status: { in: ['pending', 'processing'] } },
      orderBy: { createdAt: 'asc' },
    });
    for (const job of jobs) {
      let input: Record<string, unknown>;
      try { input = JSON.parse(job.inputJson) as Record<string, unknown>; } catch { continue; }
      const payload: RenderJobPayload = { jobId: job.id, type: job.type as RenderJobType, organizationId: job.organizationId, projectId: job.projectId, userId: job.userId, input };
      await this.prisma.renderJob.update({ where: { id: job.id }, data: { status: 'pending', progress: 0, error: null } });
      if (this.queue) await this.queue.add(job.type, payload, { jobId: job.id, removeOnComplete: 50, removeOnFail: 50 });
      else void this.runLocal(payload);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.redis?.quit();
  }

  usesRedis() {
    return !!this.queue;
  }

  async enqueue(payload: Omit<RenderJobPayload, 'jobId'>) {
    const job = await this.prisma.renderJob.create({
      data: {
        projectId: payload.projectId,
        organizationId: payload.organizationId,
        userId: payload.userId,
        type: payload.type,
        status: 'pending',
        progress: 0,
        inputJson: JSON.stringify(payload.input),
      },
    });

    const fullPayload: RenderJobPayload = { ...payload, jobId: job.id };

    if (this.queue) {
      await this.queue.add(payload.type, fullPayload, {
        jobId: job.id,
        removeOnComplete: 50,
        removeOnFail: 50,
      });
    } else {
      void this.runLocal(fullPayload);
    }

    return { jobId: job.id, status: 'pending' as const };
  }

  async getJob(jobId: string, organizationId: string) {
    const job = await this.prisma.renderJob.findUnique({ where: { id: jobId } });
    if (!job || job.organizationId !== organizationId) {
      throw new NotFoundException('任务不存在');
    }

    return {
      jobId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      error: job.error,
      outputFile: job.outputFile,
      videoUrl: job.type === 'cover' ? undefined : job.outputFile ?? undefined,
      coverUrl: job.type === 'cover' ? job.outputFile ?? undefined : undefined,
      downloadUrl:
        job.type === 'final'
          ? `${process.env.API_PUBLIC_URL ?? 'http://localhost:3001'}/api/assets/projects/${job.projectId}/download/final`
          : undefined,
    };
  }

  private async runLocal(payload: RenderJobPayload) {
    if (this.localPending.has(payload.jobId)) return;
    this.localPending.add(payload.jobId);
    try {
      await this.executeJob(payload);
    } catch {
      // executeJob 已将任务标记为 failed，本地队列不再向上抛出以免拖垮 API 进程
    } finally {
      this.localPending.delete(payload.jobId);
    }
  }

  private async executeJob(payload: RenderJobPayload) {
    await this.prisma.renderJob.update({
      where: { id: payload.jobId },
      data: { status: 'processing', progress: 10 },
    });

    try {
      let outputFile: string | undefined;
      let result: Record<string, unknown> = {};

      if (payload.type === 'subtitle') {
        const out = await this.videoRender.renderSubtitles({
          organizationId: payload.organizationId,
          projectId: payload.projectId,
          videoUrl: String(payload.input.videoUrl),
          subtitleSegments: (payload.input.subtitleSegments as never[]) ?? [],
          style: (payload.input.style as never) ?? {},
          audioUrl: payload.input.audioUrl as string | undefined,
        });
        outputFile = out.videoUrl;
        result = { videoUrl: out.videoUrl, applied: true };
      } else if (payload.type === 'digital-human') {
        const out = await this.digitalHuman.render({
          organizationId: payload.organizationId,
          projectId: payload.projectId,
          avatarId: String(payload.input.avatarId),
          audioUrl: String(payload.input.audioUrl),
          referenceVideoUrl: payload.input.referenceVideoUrl as
            | string
            | undefined,
          onProgress: async (progress) => {
            await this.prisma.renderJob.update({
              where: { id: payload.jobId },
              data: { progress: Math.min(99, progress) },
            });
          },
        });
        outputFile = out.videoUrl;
        result = {
          videoUrl: out.videoUrl,
          duration: out.duration,
          segmentCount: out.segmentCount,
          model: out.model,
        };
      } else if (payload.type === 'bgm') {
        const out = await this.videoRender.renderBgm({
          organizationId: payload.organizationId,
          projectId: payload.projectId,
          videoUrl: String(payload.input.videoUrl),
          bgmUrl: payload.input.bgmUrl as string | undefined,
          volume: Number(payload.input.volume ?? 0.2),
        });
        outputFile = out.videoUrl;
        result = { videoUrl: out.videoUrl, skipped: out.skipped };
      } else if (payload.type === 'pip') {
        const out = await this.videoRender.renderPip({
          organizationId: payload.organizationId,
          projectId: payload.projectId,
          videoUrl: String(payload.input.videoUrl),
          pip: payload.input.pip as never,
        });
        outputFile = out.videoUrl;
        result = { videoUrl: out.videoUrl, skipped: out.skipped };
      } else if (payload.type === 'cover') {
        const out = await this.videoRender.renderCover({
          organizationId: payload.organizationId,
          projectId: payload.projectId,
          text: String(payload.input.text),
          style: (payload.input.style as never) ?? {},
          videoUrl: payload.input.videoUrl as string | undefined,
          baseImageUrl: payload.input.baseImageUrl as string | undefined,
        });
        outputFile = out.coverUrl;
        result = { coverUrl: out.coverUrl };
      } else {
        const out = await this.videoRender.renderFinal({
          organizationId: payload.organizationId,
          projectId: payload.projectId,
          videoUrl: String(payload.input.videoUrl),
          subtitleSegments: payload.input.subtitleSegments as never[],
          style: payload.input.style as never,
          bgmUrl: payload.input.bgmUrl as string | undefined,
          bgmVolume: Number(payload.input.bgmVolume ?? 0.2),
          useBgm: payload.input.useBgm as boolean | undefined,
          addAiWatermark: payload.input.addAiWatermark as boolean | undefined,
          audioUrl: payload.input.audioUrl as string | undefined,
          pip: payload.input.pip as never,
          coverUrl: payload.input.coverUrl as string | undefined,
          publishWithCover: payload.input.publishWithCover as boolean | undefined,
        });
        outputFile = out.videoUrl;
        result = out;
      }

      await this.prisma.renderJob.update({
        where: { id: payload.jobId },
        data: {
          status: 'completed',
          progress: 100,
          outputFile,
          error: null,
        },
      });

      await this.prisma.project.update({
        where: { id: payload.projectId },
        data: { status: payload.type === 'final' ? 'ready' : 'processing' },
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '渲染失败';
      await this.prisma.renderJob.update({
        where: { id: payload.jobId },
        data: { status: 'failed', progress: 100, error: message },
      });
      throw err;
    }
  }
}
