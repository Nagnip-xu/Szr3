import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { statSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { resolveAvatarReferenceVideo, isBuiltinAvatar } from '../integrations/duix/avatar-options';
import { CustomAvatarService } from '../integrations/duix/custom-avatar.service';
import { DuixGpuTransferService } from '../integrations/duix/duix-gpu-transfer.service';
import { DuixVideoService } from '../integrations/duix/duix-video.service';
import { DuixApiError } from '../integrations/duix/duix.types';
import { FfmpegService } from './ffmpeg.service';
import { StorageService } from '../storage/storage.service';

export interface RenderDigitalHumanInput {
  organizationId: string;
  projectId: string;
  avatarId: string;
  audioUrl: string;
  referenceVideoUrl?: string;
  onProgress?: (progress: number, message?: string) => Promise<void>;
}

@Injectable()
export class DigitalHumanService {
  constructor(
    private readonly duixVideo: DuixVideoService,
    private readonly gpuTransfer: DuixGpuTransferService,
    private readonly customAvatars: CustomAvatarService,
    private readonly ffmpeg: FfmpegService,
    private readonly storage: StorageService,
  ) {}

  async render(input: RenderDigitalHumanInput) {
    await this.ffmpeg.ensureAvailable();

    if (!this.duixVideo.isConfigured()) {
      throw new DuixApiError('未配置 DUIX_VIDEO_API');
    }
    if (!this.gpuTransfer.isConfigured()) {
      throw new DuixApiError('未配置 GPU SSH，无法上传素材到 HeyGem');
    }

    this.storage.ensureProjectDir(input.organizationId, input.projectId);

    const report = async (progress: number, message?: string) => {
      if (input.onProgress) await input.onProgress(progress, message);
    };

    await report(5, '准备口播音频');

    const audioSaved = await this.storage.saveFromUrl(
      input.organizationId,
      input.projectId,
      'dh-audio-source.wav',
      input.audioUrl,
    );

    const audioWavPath = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'dh-audio.wav',
    );
    await this.ffmpeg.run([
      '-i',
      audioSaved.filePath,
      '-acodec',
      'pcm_s16le',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-f',
      'wav',
      '-y',
      audioWavPath,
    ]);

    await report(12, '准备参考视频');

    let referenceSource = await this.resolveReferenceVideo(
      input.organizationId,
      input.avatarId,
      input.referenceVideoUrl,
    );

    // 自定义数字人必须使用其 referenceVideoUrl，不能回退到抖音解析的 parsed-reference.mp4
    if (
      !referenceSource.includes('://') &&
      !referenceSource.startsWith('/') &&
      !(await this.gpuTransfer.existsOnFace2face(referenceSource))
    ) {
      throw new DuixApiError(
        `GPU 上缺少预设参考视频「${referenceSource}」。请先在上一步解析视频链接，或上传自定义数字人参考口播视频。`,
      );
    }

    let referenceLocalPath: string | null = null;
    if (referenceSource.includes('://') || referenceSource.startsWith('/')) {
      const refSaved = await this.storage.saveFromUrl(
        input.organizationId,
        input.projectId,
        'dh-reference.mp4',
        referenceSource,
      );
      referenceLocalPath = refSaved.filePath;
    } else if (this.storage.isLocalAssetUrl(referenceSource)) {
      referenceLocalPath = this.storage.localPathFromUrl(referenceSource);
    }

    const jobPrefix = `szr3-${input.projectId.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
    const remoteAudioName = `${jobPrefix}.wav`;
    const remoteVideoName = `${jobPrefix}-ref.mp4`;

    await report(18, '上传素材到 GPU 服务器');

    await this.gpuTransfer.uploadToFace2face(audioWavPath, remoteAudioName);

    const remoteVideoRef = await this.gpuTransfer.ensureReferenceOnGpu(
      referenceSource,
      referenceLocalPath,
      remoteVideoName,
    );

    await report(25, '提交 HeyGem 视频合成任务');

    const { taskCode } = await this.duixVideo.submit({
      audioFilename: this.gpuTransfer.toContainerPath(remoteAudioName),
      videoFilename: this.gpuTransfer.toContainerPath(remoteVideoRef),
    });

    const queryResult = await this.duixVideo.waitForResult(taskCode, {
      onProgress: async (progress, message) => {
        await report(progress, message ?? 'HeyGem 生成中');
      },
    });

    if (!queryResult.resultPath) {
      throw new DuixApiError('HeyGem 完成但未返回视频路径');
    }

    await report(92, '下载生成结果');

    const outputPath = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'digital-human.mp4',
    );
    await this.gpuTransfer.downloadFromFace2face(
      queryResult.resultPath,
      outputPath,
    );

    // Make the MP4 playable before its full download completes.
    const optimizedPath = `${outputPath}.faststart.mp4`;
    await this.ffmpeg.run([
      '-i', outputPath,
      '-map', '0',
      '-c', 'copy',
      '-movflags', '+faststart',
      '-y', optimizedPath,
    ]);
    await rename(optimizedPath, outputPath);

    const duration = await this.ffmpeg.probeDurationSeconds(outputPath);
    const videoUrl = this.storage.toVersionedPublicUrl(
      input.organizationId,
      input.projectId,
      'digital-human.mp4',
      statSync(outputPath).mtimeMs,
    );

    await report(100, '数字人视频生成完成');

    return {
      videoUrl,
      duration,
      segmentCount: 1,
      model: 'heygem-duix-avatar',
    };
  }

  private async resolveReferenceVideo(
    organizationId: string,
    avatarId: string,
    overrideUrl?: string,
  ) {
    if (avatarId.startsWith('custom-')) {
      const custom = await this.customAvatars.get(organizationId, avatarId);
      if (!custom) {
        throw new DuixApiError('自定义数字人不存在，请重新上传');
      }
      return custom.referenceVideoUrl;
    }

    if (isBuiltinAvatar(avatarId)) {
      return resolveAvatarReferenceVideo(avatarId);
    }

    throw new DuixApiError(
      '请先上传 5–30 秒正脸口播参考视频，并保存为「我的数字人」后再生成',
    );
  }

  private isRemoteMediaUrl(url: string) {
    return url.includes('://') || url.startsWith('/');
  }
}
