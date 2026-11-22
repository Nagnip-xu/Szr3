import { Injectable } from '@nestjs/common';
import { writeFile, copyFile } from 'node:fs/promises';
import type { SubtitleSegment } from '../integrations/bailian/bailian.types';
import { FfmpegService } from './ffmpeg.service';
import { buildAssContent, normalizeSubtitleStyle, type SubtitleStyleOptions } from './subtitle-ass.builder';
import { StorageService } from '../storage/storage.service';

export interface RenderSubtitleInput {
  organizationId: string;
  projectId: string;
  videoUrl: string;
  subtitleSegments: SubtitleSegment[];
  style: SubtitleStyleOptions;
  audioUrl?: string | null;
}

export interface RenderBgmInput {
  organizationId: string;
  projectId: string;
  videoUrl: string;
  bgmUrl?: string | null;
  volume: number;
}

export interface RenderPipInput {
  organizationId: string;
  projectId: string;
  videoUrl: string;
  pip: {
    enabled: boolean;
    assetUrl?: string | null;
    position: string;
    scale: number;
    opacity: number;
    startSec: number;
    durationSec: number;
    borderRadius?: number;
  };
}

export interface RenderCoverInput {
  organizationId: string;
  projectId: string;
  text: string;
  style: {
    fontSize?: number;
    color?: string;
    position?: 'top' | 'center' | 'bottom';
  };
  videoUrl?: string | null;
  baseImageUrl?: string | null;
}

export interface RenderFinalInput {
  organizationId: string;
  projectId: string;
  videoUrl: string;
  subtitleSegments?: SubtitleSegment[];
  style?: SubtitleStyleOptions;
  bgmUrl?: string | null;
  bgmVolume?: number;
  useBgm?: boolean;
  addAiWatermark?: boolean;
  audioUrl?: string | null;
  pip?: RenderPipInput['pip'];
  coverUrl?: string | null;
  publishWithCover?: boolean;
}

@Injectable()
export class VideoRenderService {
  constructor(
    private readonly ffmpeg: FfmpegService,
    private readonly storage: StorageService,
  ) {}

  async renderSubtitles(input: RenderSubtitleInput) {
    await this.ffmpeg.ensureAvailable();
    this.storage.ensureProjectDir(input.organizationId, input.projectId);

    const source = await this.storage.saveFromUrl(
      input.organizationId,
      input.projectId,
      'source-input.mp4',
      input.videoUrl,
    );

    const normalized = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'normalized.mp4',
    );
    const videoPath = await this.ffmpeg.ensureVideoInput(
      source.filePath,
      normalized,
      input.audioUrl
        ? (
            await this.storage.saveFromUrl(
              input.organizationId,
              input.projectId,
              'audio-ref.mp3',
              input.audioUrl,
            )
          ).filePath
        : undefined,
    );

    const dimensions = await this.ffmpeg.probeVideoDimensions(videoPath);
    const style = normalizeSubtitleStyle({
      ...input.style,
      playResX: dimensions.width,
      playResY: dimensions.height,
    });

    const assPath = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'subtitles.ass',
    );
    await writeFile(
      assPath,
      buildAssContent(input.subtitleSegments, style),
      'utf8',
    );

    const outputPath = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'subtitled.mp4',
    );
    this.ffmpeg.ensureParentDir(outputPath);

    if (input.subtitleSegments.length > 0) {
      await this.ffmpeg.burnSubtitles(videoPath, assPath, outputPath);
    } else {
      await this.ffmpeg.copyOrTranscode(videoPath, outputPath);
    }

    return {
      videoUrl: this.storage.toPublicUrl(
        input.organizationId,
        input.projectId,
        'subtitled.mp4',
      ),
      filePath: outputPath,
    };
  }

  async renderBgm(input: RenderBgmInput) {
    await this.ffmpeg.ensureAvailable();
    this.storage.ensureProjectDir(input.organizationId, input.projectId);

    const source = await this.resolveLocalVideo(
      input.organizationId,
      input.projectId,
      input.videoUrl,
      'bgm-input.mp4',
    );

    if (!input.bgmUrl) {
      const passthrough = this.storage.projectFilePath(
        input.organizationId,
        input.projectId,
        'with-bgm.mp4',
      );
      await this.ffmpeg.copyOrTranscode(source.filePath, passthrough);
      return {
        videoUrl: this.storage.toPublicUrl(
          input.organizationId,
          input.projectId,
          'with-bgm.mp4',
        ),
        skipped: true,
      };
    }

    const bgm = await this.storage.saveFromUrl(
      input.organizationId,
      input.projectId,
      'bgm.mp3',
      input.bgmUrl,
    );

    const outputPath = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'with-bgm.mp4',
    );
    this.ffmpeg.ensureParentDir(outputPath);
    await this.ffmpeg.mixBgm(
      source.filePath,
      bgm.filePath,
      outputPath,
      input.volume,
    );

    return {
      videoUrl: this.storage.toPublicUrl(
        input.organizationId,
        input.projectId,
        'with-bgm.mp4',
      ),
      skipped: false,
    };
  }

  async renderPip(input: RenderPipInput) {
    await this.ffmpeg.ensureAvailable();
    this.storage.ensureProjectDir(input.organizationId, input.projectId);

    if (!input.pip.enabled) {
      return { videoUrl: input.videoUrl, skipped: true };
    }
    if (!input.pip.assetUrl) {
      throw new Error('请先上传画中画素材');
    }

    const main = await this.resolveLocalVideo(
      input.organizationId,
      input.projectId,
      input.videoUrl,
      'pip-main.mp4',
    );
    const overlay = await this.storage.saveFromUrl(
      input.organizationId,
      input.projectId,
      'pip-overlay' + (input.pip.assetUrl.includes('.mp4') ? '.mp4' : '.jpg'),
      input.pip.assetUrl,
    );

    const outputPath = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'with-pip.mp4',
    );
    this.ffmpeg.ensureParentDir(outputPath);

    await this.ffmpeg.overlayPip(
      main.filePath,
      overlay.filePath,
      outputPath,
      {
        position: input.pip.position,
        scale: input.pip.scale,
        opacity: input.pip.opacity,
        startSec: input.pip.startSec,
        durationSec: input.pip.durationSec,
        borderRadius: input.pip.borderRadius,
      },
    );

    return {
      videoUrl: this.storage.toPublicUrl(
        input.organizationId,
        input.projectId,
        'with-pip.mp4',
      ),
      skipped: false,
    };
  }

  async renderCover(input: RenderCoverInput) {
    await this.ffmpeg.ensureAvailable();
    this.storage.ensureProjectDir(input.organizationId, input.projectId);

    const bgPath = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'cover-bg.jpg',
    );
    const outputPath = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'cover.jpg',
    );
    this.ffmpeg.ensureParentDir(outputPath);

    if (input.baseImageUrl) {
      const bg = await this.storage.saveFromUrl(
        input.organizationId,
        input.projectId,
        'cover-bg-source.jpg',
        input.baseImageUrl,
      );
      await copyFile(bg.filePath, bgPath);
    } else if (input.videoUrl) {
      const video = await this.resolveLocalVideo(
        input.organizationId,
        input.projectId,
        input.videoUrl,
        'cover-source.mp4',
      );
      await this.ffmpeg.extractFrame(video.filePath, bgPath, 0.5);
    } else {
      throw new Error('请提供视频或背景图以生成封面');
    }

    await this.ffmpeg.renderCoverImage(bgPath, outputPath, {
      text: input.text,
      fontSize: Number(input.style.fontSize ?? 48),
      color: String(input.style.color ?? '#FFFFFF'),
      position: input.style.position ?? 'bottom',
    });

    return {
      coverUrl: this.storage.toPublicUrl(
        input.organizationId,
        input.projectId,
        'cover.jpg',
      ),
    };
  }

  async renderFinal(input: RenderFinalInput) {
    let currentUrl = input.videoUrl;

    if (input.pip?.enabled) {
      const withPip = await this.renderPip({
        organizationId: input.organizationId,
        projectId: input.projectId,
        videoUrl: currentUrl,
        pip: input.pip,
      });
      currentUrl = withPip.videoUrl;
    }

    if (input.subtitleSegments?.length) {
      const subtitled = await this.renderSubtitles({
        organizationId: input.organizationId,
        projectId: input.projectId,
        videoUrl: currentUrl,
        subtitleSegments: input.subtitleSegments,
        style: input.style ?? {},
        audioUrl: input.audioUrl,
      });
      currentUrl = subtitled.videoUrl;
    }

    if (input.useBgm !== false) {
      const withBgm = await this.renderBgm({
        organizationId: input.organizationId,
        projectId: input.projectId,
        videoUrl: currentUrl,
        bgmUrl: input.bgmUrl,
        volume: input.bgmVolume ?? 0.2,
      });
      currentUrl = withBgm.videoUrl;
    }

    const source = await this.resolveLocalVideo(
      input.organizationId,
      input.projectId,
      currentUrl,
      'final-source.mp4',
    );

    const finalPath = this.storage.projectFilePath(
      input.organizationId,
      input.projectId,
      'final.mp4',
    );
    this.ffmpeg.ensureParentDir(finalPath);

    if (input.addAiWatermark) {
      await this.ffmpeg.addWatermark(
        source.filePath,
        finalPath,
        '此视频为AI生成',
      );
    } else {
      await this.ffmpeg.copyOrTranscode(source.filePath, finalPath);
    }

    let exportPath = finalPath;
    if (input.publishWithCover && input.coverUrl) {
      const coverLocal = await this.storage.saveFromUrl(
        input.organizationId,
        input.projectId,
        'cover-for-final.jpg',
        input.coverUrl,
      );
      const withCoverPath = this.storage.projectFilePath(
        input.organizationId,
        input.projectId,
        'final-with-cover.mp4',
      );
      await this.ffmpeg.prependCoverFrame(
        coverLocal.filePath,
        finalPath,
        withCoverPath,
      );
      exportPath = withCoverPath;
    }

    const duration = await this.ffmpeg.probeDurationSeconds(exportPath);

    return {
      videoUrl: this.storage.toPublicUrl(
        input.organizationId,
        input.projectId,
        exportPath.endsWith('final-with-cover.mp4')
          ? 'final-with-cover.mp4'
          : 'final.mp4',
      ),
      downloadUrl: `${process.env.API_PUBLIC_URL ?? 'http://localhost:3001'}/api/assets/projects/${input.projectId}/download/final`,
      duration,
    };
  }

  private async resolveLocalVideo(
    organizationId: string,
    projectId: string,
    videoUrl: string,
    filename: string,
  ) {
    const local = this.storage.localPathFromUrl(videoUrl);
    if (local && this.storage.fileExists(local)) {
      return { filePath: local };
    }
    return this.storage.saveFromUrl(organizationId, projectId, filename, videoUrl);
  }
}
