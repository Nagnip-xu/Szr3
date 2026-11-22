import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import { AVATAR_OPTIONS } from '../integrations/duix/avatar-options';
import { DuixGpuTransferService } from '../integrations/duix/duix-gpu-transfer.service';
import { FfmpegService } from '../media/ffmpeg.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PresetAvatarService {
  constructor(
    private readonly storage: StorageService,
    private readonly gpuTransfer: DuixGpuTransferService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  findBuiltin(avatarId: string) {
    const normalized = avatarId.replace(/\.mp4$/i, '');
    return AVATAR_OPTIONS.find((a) => a.id === normalized) ?? null;
  }

  previewUrl(avatarId: string) {
    const avatar = this.findBuiltin(avatarId);
    if (!avatar) return null;
    return this.storage.toPresetAvatarPreviewUrl(avatarId);
  }

  /** 确保本地缓存存在；缺失时从 GPU 拉取参考口播样片 */
  async ensureLocalPreview(avatarId: string) {
    const avatar = this.findBuiltin(avatarId);
    if (!avatar) {
      throw new NotFoundException('预设数字人不存在');
    }

    const localPath = this.storage.presetAvatarFilePath(avatar.referenceVideo);
    if (existsSync(localPath)) {
      return localPath;
    }

    if (!this.gpuTransfer.isConfigured()) {
      throw new NotFoundException('口播样片尚未缓存，且 GPU 未配置');
    }

    const remoteExists = await this.gpuTransfer.existsOnFace2face(
      avatar.referenceVideo,
    );
    if (!remoteExists) {
      throw new NotFoundException(
        'GPU 上缺少该数字人的参考口播视频，请先运行 npm run bootstrap:avatars',
      );
    }

    this.storage.ensurePresetAvatarDir(avatar.referenceVideo);
    await this.gpuTransfer.downloadFromFace2face(
      avatar.referenceVideo,
      localPath,
    );
    return localPath;
  }

  /** Extract and cache a lightweight cover image for the preset picker. */
  async ensureLocalPoster(avatarId: string) {
    const avatar = this.findBuiltin(avatarId);
    if (!avatar) {
      throw new NotFoundException('预设数字人不存在');
    }

    const sourcePath = await this.ensureLocalPreview(avatarId);
    const posterReference = avatar.referenceVideo.replace(
      new RegExp(`${extname(avatar.referenceVideo)}$`, 'i'),
      '.jpg',
    );
    const posterPath = this.storage.presetAvatarFilePath(posterReference);
    if (existsSync(posterPath)) {
      return posterPath;
    }

    this.storage.ensurePresetAvatarDir(posterReference);
    await this.ffmpeg.extractFrame(sourcePath, posterPath, 0.5);
    return posterPath;
  }
}
