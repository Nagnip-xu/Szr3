import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import {
  IsteroApiError,
  IsteroVideoParser,
} from '../integrations/istero/istero-video.parser';
import { DuixAsrService } from '../integrations/duix/duix-asr.service';
import { DuixTtsService } from '../integrations/duix/duix-tts.service';
import { DuixVideoService } from '../integrations/duix/duix-video.service';
import { DuixGpuTransferService } from '../integrations/duix/duix-gpu-transfer.service';
import { CustomAvatarService } from '../integrations/duix/custom-avatar.service';
import { CustomVoiceService } from '../integrations/duix/custom-voice.service';
import { DuixApiError } from '../integrations/duix/duix.types';
import { AVATAR_OPTIONS } from '../integrations/duix/avatar-options';
import { DUIX_VOICE_PROFILES } from '../integrations/duix/duix-voices';
import { DeepSeekLlmService } from '../integrations/shuaiapi/deepseek-llm.service';
import { LlmApiError } from '../integrations/shuaiapi/llm.types';
import { FfmpegService } from '../media/ffmpeg.service';
import { SubtitleAlignmentService } from '../media/subtitle-alignment.service';
import { RenderQueueService } from '../queue/render-queue.service';
import { StorageService } from '../storage/storage.service';
import { AuthUser } from '../common/types';
import type { SubtitleSegment } from '../integrations/bailian/bailian.types';
import { ComplianceService } from '../compliance/compliance.service';

const SAMPLE_TITLE =
  '实体商家必看！一条链接复制爆款口播，数字人4步自动出片';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly duixAsr: DuixAsrService,
    private readonly duixTts: DuixTtsService,
    private readonly duixVideo: DuixVideoService,
    private readonly gpuTransfer: DuixGpuTransferService,
    private readonly customVoices: CustomVoiceService,
    private readonly customAvatars: CustomAvatarService,
    private readonly ffmpeg: FfmpegService,
    private readonly subtitleAlignment: SubtitleAlignmentService,
    private readonly deepseekLlm: DeepSeekLlmService,
    private readonly renderQueue: RenderQueueService,
    private readonly storage: StorageService,
    private readonly compliance: ComplianceService,
  ) {}

  private requireProjectId(projectId?: string) {
    if (!projectId?.trim()) {
      throw new BadRequestException('请先在企业空间创建或打开项目');
    }
    return projectId.trim();
  }

  private getVideoParser(): IsteroVideoParser | null {
    const token = process.env.ISTERO_API_TOKEN?.trim();
    if (!token) return null;
    return new IsteroVideoParser(token, process.env.ISTERO_APP_SECRET?.trim());
  }

  private duixConfigured() {
    return (
      this.duixAsr.isConfigured() &&
      this.duixTts.isConfigured() &&
      this.duixVideo.isConfigured() &&
      this.gpuTransfer.isConfigured()
    );
  }

  private requireDuix() {
    if (!this.duixConfigured()) {
      throw new ServiceUnavailableException(
        '未配置 HeyGem GPU 服务，请在 api/.env 中设置 DUIX_VIDEO_API、DUIX_TTS_API、DUIX_ASR_WS 及 GPU SSH',
      );
    }
  }

  private async downloadToTemp(url: string, ext = '.mp4') {
    const dir = await mkdtemp(join(tmpdir(), 'szr3-asr-'));
    const filePath = join(dir, `${randomUUID()}${ext}`);
    const res = await this.storage.fetchRemote(url, { timeoutMs: 180_000 });
    if (!res.ok || !res.body) {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      throw new DuixApiError(`下载媒体失败 (${res.status})`);
    }
    await pipeline(res.body as never, createWriteStream(filePath));
    return { filePath, cleanup: () => rm(dir, { recursive: true, force: true }) };
  }

  private extractShareUrl(input: string) {
    const trimmed = input.trim();
    const httpMatch = trimmed.match(/https?:\/\/[^\s\u4e00-\u9fff]+/i);
    if (httpMatch) return httpMatch[0].replace(/[，。！？,.!?]+$/, '');

    const shortMatch = trimmed.match(/v\.douyin\.com\/[^\s/]+/i);
    if (shortMatch) return `https://${shortMatch[0]}`;

    return trimmed;
  }

  async extractScript(user: AuthUser, params: { url: string; projectId?: string }) {
    const raw = params.url;
    if (!raw?.trim()) {
      throw new BadRequestException('请输入有效的视频链接');
    }

    const url = this.extractShareUrl(raw);
    if (!/^https?:\/\//i.test(url)) {
      throw new BadRequestException(
        '未识别到有效链接。请在抖音 App 点「分享 → 复制链接」，粘贴含 https:// 或 v.douyin.com 的完整内容',
      );
    }

    const parser = this.getVideoParser();
    if (!parser) {
      throw new ServiceUnavailableException(
        '未配置 ISTERO_API_TOKEN，请在 api/.env 中设置起零数据 Token',
      );
    }

    this.requireDuix();

    try {
      const parsed = await parser.parse(url.trim());

      const temp = await this.downloadToTemp(parsed.videoUrl);
      let videoPublicUrl = parsed.videoUrl;

      let asrResult;
      try {
        asrResult = await this.duixAsr.transcribeLocalFile(temp.filePath);

        if (params.projectId?.trim()) {
          const projectId = this.requireProjectId(params.projectId);
          const destPath = this.storage.projectFilePath(
            user.organizationId,
            projectId,
            'parsed-reference.mp4',
          );
          await mkdir(dirname(destPath), { recursive: true });
          await copyFile(temp.filePath, destPath);
          videoPublicUrl = this.storage.toPublicUrl(
            user.organizationId,
            projectId,
            'parsed-reference.mp4',
          );
        }
      } catch (err) {
        const message =
          err instanceof DuixApiError
            ? err.message
            : '口播转写失败，请稍后重试';
        throw new BadGatewayException(message);
      } finally {
        await temp.cleanup();
      }

      return {
        script: asrResult.script,
        title: parsed.title,
        cover: parsed.cover,
        videoUrl: videoPublicUrl,
        scriptPending: false,
        subtitleSegments: asrResult.subtitleSegments,
        durationMs: asrResult.durationMs,
        asrModel: asrResult.model,
        hasWordTimestamps: asrResult.hasWordTimestamps,
        parseMeta: {
          requestId: parsed.requestId,
          providerName: parsed.providerName,
          elapsedTime: parsed.elapsedTime,
        },
      };
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      if (err instanceof IsteroApiError) {
        if (err.code === 429) {
          throw new BadGatewayException(err.message);
        }
        throw new BadRequestException(err.message);
      }
      throw new BadGatewayException('视频解析服务暂时不可用');
    }
  }

  async rewriteScript(params: {
    script: string;
    mode: string;
    customPrompt?: string;
  }) {
    if (!params.script?.trim()) {
      throw new BadRequestException('请先提取或输入原始文案');
    }

    if (!this.deepseekLlm.isConfigured()) {
      throw new ServiceUnavailableException(
        '未配置 SHUAIAPI_API_KEY，请在 api/.env 中设置 DeepSeek 中转 Key',
      );
    }

    try {
      const result = await this.deepseekLlm.rewriteScript({
        script: params.script,
        mode: params.mode === 'custom' ? 'custom' : 'auto',
        customPrompt: params.customPrompt,
      });

      return {
        script: result.content,
        model: result.model,
        usage: result.usage,
      };
    } catch (err) {
      const message =
        err instanceof LlmApiError ? err.message : '文案仿写失败，请稍后重试';
      throw new BadGatewayException(message);
    }
  }

  async reviewScript(script: string) {
    const text = script?.trim() ?? '';
    if (!text) throw new BadRequestException('请先输入或提取文案');

    const rules: Array<{ term: string; replacement: string; reason: string }> = [
      { term: '稳赚不赔', replacement: '风险需结合实际情况评估', reason: '绝对化收益承诺' },
      { term: '百分之百', replacement: '大概率', reason: '绝对化表述' },
      { term: '最安全', replacement: '更安全', reason: '绝对化比较' },
      { term: '第一', replacement: '领先', reason: '无依据排名表述' },
      { term: '保证', replacement: '建议', reason: '承诺性表述' },
      { term: '药到病除', replacement: '辅助改善', reason: '医疗效果承诺' },
    ];
    const findings = rules
      .filter((rule) => text.includes(rule.term))
      .map((rule) => ({ ...rule, count: text.split(rule.term).length - 1 }));
    let optimized = text;
    for (const finding of findings) optimized = optimized.split(finding.term).join(finding.replacement);
    return {
      safe: findings.length === 0,
      riskLevel: findings.length >= 3 ? 'high' : findings.length > 0 ? 'medium' : 'low',
      findings,
      optimized,
      summary: findings.length ? `发现 ${findings.length} 类需要注意的表述` : '未发现内置规则命中的高风险表述',
    };
  }

  async generateAudio(
    user: AuthUser,
    params: { text: string; voiceId: string; rate: number; projectId?: string },
  ) {
    if (!params.text?.trim()) {
      throw new BadRequestException('请先生成或输入口播文案');
    }

    this.requireDuix();

    try {
      const result = await this.duixTts.synthesize({
        text: params.text,
        voiceId: params.voiceId,
        organizationId: user.organizationId,
      });

      const rate = Math.min(2, Math.max(0.5, params.rate ?? 1));
      const projectId = params.projectId ?? 'tmp';
      // A fresh URL prevents browsers from retaining the previous generated
      // audio buffer after the project state is updated.
      const audioId = randomUUID();
      const outputName = `audio-${audioId}.mp3`;
      const rawName = `audio-raw-${audioId}.wav`;
      await this.ffmpeg.ensureAvailable();
      const rawPath = this.storage.projectFilePath(user.organizationId, projectId, rawName);
      const outputPath = this.storage.projectFilePath(user.organizationId, projectId, outputName);
      await this.storage.saveBuffer(user.organizationId, projectId, rawName, result.wavBuffer);
      await this.ffmpeg.run([
        '-i', rawPath,
        ...(Math.abs(rate - 1) > 0.01 ? ['-filter:a', `atempo=${rate}`] : []),
        '-c:a', 'libmp3lame', '-b:a', '64k', '-y', outputPath,
      ]);
      const duration = await this.ffmpeg.probeDurationSeconds(outputPath);
      const audioUrl = this.storage.toPublicUrl(user.organizationId, projectId, outputName);
      const durationMs = Math.round(duration * 1000);
      let subtitleSegments: SubtitleSegment[] = [];
      if (params.projectId?.trim()) {
        subtitleSegments = await this.subtitleAlignment.alignFromAudio(
          user.organizationId,
          projectId,
          audioUrl,
          params.text,
        );
      }

      return {
        audioUrl,
        duration: duration || result.duration,
        durationMs,
        subtitleSegments,
        model: result.model,
        voice: result.voice,
        persisted: !!params.projectId,
      };
    } catch (err) {
      const message =
        err instanceof DuixApiError ? err.message : '音频生成失败，请稍后重试';
      throw new BadGatewayException(message);
    }
  }

  async generateDigitalHuman(
    user: AuthUser,
    params: {
      projectId?: string;
      avatarId: string;
      audioUrl: string;
      imageUrl?: string;
      referenceVideoUrl?: string;
    },
  ) {
    const projectId = this.requireProjectId(params.projectId);

    if (!params.audioUrl?.trim()) {
      throw new BadRequestException('请先生成口播音频');
    }

    this.requireDuix();

    return this.renderQueue.enqueue({
      type: 'digital-human',
      organizationId: user.organizationId,
      projectId,
      userId: user.id,
      input: {
        avatarId: params.avatarId,
        audioUrl: params.audioUrl,
        referenceVideoUrl: params.referenceVideoUrl,
      },
    });
  }

  async generateSubtitles(
    user: AuthUser,
    params: {
      projectId?: string;
      videoUrl: string;
      script: string;
      style: Record<string, unknown>;
      subtitleSegments?: SubtitleSegment[];
      audioUrl?: string;
    },
  ) {
    const projectId = this.requireProjectId(params.projectId);
    const subtitleSegments = await this.resolveSubtitleSegments(user, projectId, {
      subtitleSegments: params.subtitleSegments,
      audioUrl: params.audioUrl,
      script: params.script,
    });

    return this.renderQueue.enqueue({
      type: 'subtitle',
      organizationId: user.organizationId,
      projectId,
      userId: user.id,
      input: {
        videoUrl: params.videoUrl,
        subtitleSegments,
        style: params.style,
        audioUrl: params.audioUrl,
      },
    });
  }

  async generateBgm(
    user: AuthUser,
    params: {
      projectId?: string;
      videoUrl: string;
      volume: number;
      bgmUrl?: string;
    },
  ) {
    const projectId = this.requireProjectId(params.projectId);

    return this.renderQueue.enqueue({
      type: 'bgm',
      organizationId: user.organizationId,
      projectId,
      userId: user.id,
      input: {
        videoUrl: params.videoUrl,
        volume: params.volume,
        bgmUrl: params.bgmUrl,
      },
    });
  }

  async renderFinalVideo(
    user: AuthUser,
    params: {
      projectId?: string;
      videoUrl: string;
      subtitleSegments?: SubtitleSegment[];
      style?: Record<string, unknown>;
      bgmUrl?: string;
      bgmVolume?: number;
      useBgm?: boolean;
      addAiWatermark?: boolean;
      audioUrl?: string;
      title?: string;
      pip?: Record<string, unknown>;
      coverUrl?: string;
      publishWithCover?: boolean;
      script?: string;
    },
  ) {
    const projectId = this.requireProjectId(params.projectId);
    const subtitleSegments = await this.resolveSubtitleSegments(user, projectId, {
      subtitleSegments: params.subtitleSegments,
      audioUrl: params.audioUrl,
      script: params.script,
    });

    return this.renderQueue.enqueue({
      type: 'final',
      organizationId: user.organizationId,
      projectId,
      userId: user.id,
      input: {
        videoUrl: params.videoUrl,
        subtitleSegments,
        style: params.style ?? {},
        bgmUrl: params.bgmUrl,
        bgmVolume: params.bgmVolume ?? 0.2,
        useBgm: params.useBgm ?? true,
        addAiWatermark: params.addAiWatermark ?? false,
        audioUrl: params.audioUrl,
        pip: params.pip,
        coverUrl: params.coverUrl,
        publishWithCover: params.publishWithCover,
      },
    });
  }

  async getWorkflowOptions(user?: AuthUser) {
    const builtin = Object.entries(DUIX_VOICE_PROFILES).map(([id, v]) => ({
      id,
      name: v.name,
      tag: v.tag,
    }));

    let customVoices: { id: string; name: string; tag: string }[] = [];
    let customAvatars: {
      id: string;
      name: string;
      preview: string;
      referenceVideo: string;
      tag: string;
    }[] = [];

    if (user?.organizationId) {
      const storedVoices = await this.customVoices.list(user.organizationId);
      customVoices = storedVoices.map((v) => ({
        id: v.id,
        name: v.name,
        tag: v.tag,
      }));

      const storedAvatars = await this.customAvatars.list(user.organizationId);
      customAvatars = storedAvatars.map((a) => ({
        id: a.id,
        name: a.name,
        preview: a.previewUrl,
        referenceVideo: a.referenceVideoUrl,
        tag: '自定义数字人',
      }));
    }

    const builtinAvatars = AVATAR_OPTIONS.map((a) => ({
      id: a.id,
      name: a.name,
      preview: this.storage.toPresetAvatarPosterUrl(a.id),
      previewVideo: this.storage.toPresetAvatarPreviewUrl(a.id),
      referenceVideo: a.referenceVideo,
      tag: '系统预设',
    }));

    return {
      avatars: [...customAvatars, ...builtinAvatars],
      voices: [...customVoices, ...builtin],
      gpu: {
        sshConfigured: this.gpuTransfer.isConfigured(),
        duixConfigured: this.duixConfigured(),
        tunnelHint:
          '默认通过 SSH 隧道访问 GPU 上的 Duix 服务（DUIX_USE_SSH_TUNNEL=true）',
      },
    };
  }

  getRenderJob(user: AuthUser, jobId: string) {
    return this.renderQueue.getJob(jobId, user.organizationId);
  }

  getDownloadUrl(projectId: string) {
    const base = process.env.API_PUBLIC_URL ?? 'http://localhost:3001';
    return `${base}/api/assets/projects/${projectId}/download/final`;
  }

  async generateTitle(params: { script: string }) {
    if (!params.script?.trim()) {
      throw new BadRequestException('请先生成口播文案');
    }

    if (!this.deepseekLlm.isConfigured()) {
      return {
        title: SAMPLE_TITLE,
        hashtags: '#数字人 #口播 #实体获客 #短视频营销',
      };
    }

    try {
      const result = await this.deepseekLlm.generateTitle(params.script);
      const lines = result.content
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const title = lines[0]?.replace(/^标题[:：]\s*/, '') ?? SAMPLE_TITLE;
      const hashtagLine =
        lines.find((l) => l.includes('#')) ??
        lines.slice(1).join(' ') ??
        '#数字人 #口播';
      return {
        title,
        hashtags: hashtagLine.replace(/^标签[:：]\s*/, ''),
        model: result.model,
      };
    } catch {
      return {
        title: SAMPLE_TITLE,
        hashtags: '#数字人 #口播 #实体获客 #短视频营销',
      };
    }
  }

  async generateCover(
    user: AuthUser,
    params: {
      projectId?: string;
      text: string;
      style: Record<string, unknown>;
      videoUrl?: string;
      baseImageUrl?: string;
    },
  ) {
    const projectId = this.requireProjectId(params.projectId);
    if (!params.text?.trim()) {
      throw new BadRequestException('请输入封面文案');
    }
    if (!params.videoUrl && !params.baseImageUrl) {
      throw new BadRequestException('请提供视频或背景图');
    }

    return this.renderQueue.enqueue({
      type: 'cover',
      organizationId: user.organizationId,
      projectId,
      userId: user.id,
      input: {
        text: params.text,
        style: params.style,
        videoUrl: params.videoUrl,
        baseImageUrl: params.baseImageUrl,
      },
    });
  }

  async applyPip(
    user: AuthUser,
    params: {
      projectId?: string;
      videoUrl: string;
      enabled: boolean;
      assetUrl?: string;
      assetTag?: string;
      position: string;
      scale: number;
      opacity: number;
      startSec: number;
      durationSec: number;
      borderRadius: number;
    },
  ) {
    const projectId = this.requireProjectId(params.projectId);

    if (!params.videoUrl?.trim()) {
      throw new BadRequestException('请先生成数字人视频');
    }
    if (params.enabled && !params.assetUrl) {
      throw new BadRequestException('请先上传画中画素材');
    }

    return this.renderQueue.enqueue({
      type: 'pip',
      organizationId: user.organizationId,
      projectId,
      userId: user.id,
      input: {
        videoUrl: params.videoUrl,
        pip: {
          enabled: params.enabled,
          assetUrl: params.assetUrl,
          position: params.position,
          scale: params.scale,
          opacity: params.opacity,
          startSec: params.startSec,
          durationSec: params.durationSec,
          borderRadius: params.borderRadius,
        },
      },
    });
  }

  async saveCustomAvatar(
    user: AuthUser,
    params: { projectId: string; videoUrl: string; name?: string; consentId?: string },
  ) {
    this.requireDuix();
    const projectId = this.requireProjectId(params.projectId);
    await this.compliance.requireConsent(user, projectId, params.consentId, 'avatar_clone');
    if (!params.videoUrl?.trim()) {
      throw new BadRequestException('请先上传参考口播视频');
    }

    await this.ffmpeg.ensureAvailable();

    const ext =
      params.videoUrl.match(/\.(mp4|webm|mov)(\?|$)/i)?.[1]?.toLowerCase() ??
      'mp4';

    const saved = await this.storage.saveFromUrl(
      user.organizationId,
      projectId,
      `avatar-ref-source.${ext}`,
      params.videoUrl.trim(),
    );

    const previewFilename = `avatar-preview-${randomUUID().slice(0, 8)}.jpg`;
    const previewPath = this.storage.projectFilePath(
      user.organizationId,
      projectId,
      previewFilename,
    );
    await this.ffmpeg.extractFrame(saved.filePath, previewPath, 0.5);

    const previewPublicUrl = this.storage.toPublicUrl(
      user.organizationId,
      projectId,
      previewFilename,
    );

    const avatar = await this.customAvatars.add(user.organizationId, {
      name: params.name?.trim() || '我的数字人',
      referenceVideoUrl: saved.publicUrl,
      previewUrl: previewPublicUrl,
    });

    return {
      id: avatar.id,
      name: avatar.name,
      preview: avatar.previewUrl,
      referenceVideo: avatar.referenceVideoUrl,
      tag: '自定义数字人',
    };
  }

  async deleteCustomAvatar(user: AuthUser, avatarId: string) {
    if (!avatarId?.startsWith('custom-')) {
      throw new BadRequestException('只能删除自定义数字人');
    }

    const avatar = await this.customAvatars.remove(
      user.organizationId,
      avatarId,
    );
    if (!avatar) {
      throw new NotFoundException('数字人不存在或已删除');
    }

    return {
      id: avatar.id,
      deleted: true,
    };
  }

  async trainCustomVoice(
    user: AuthUser,
    params: { projectId: string; audioUrl: string; name?: string; consentId?: string },
  ) {
    this.requireDuix();
    const projectId = this.requireProjectId(params.projectId);
    await this.compliance.requireConsent(user, projectId, params.consentId, 'voice_clone');
    if (!params.audioUrl?.trim()) {
      throw new BadRequestException('请先上传参考音频');
    }

    await this.ffmpeg.ensureAvailable();

    const ext =
      params.audioUrl.match(/\.(wav|mp3|m4a|aac|ogg|webm)(\?|$)/i)?.[1]?.toLowerCase() ??
      'wav';

    const saved = await this.storage.saveFromUrl(
      user.organizationId,
      projectId,
      `voice-ref-source.${ext}`,
      params.audioUrl.trim(),
    );

    const wavPath = this.storage.projectFilePath(
      user.organizationId,
      projectId,
      `voice-ref-${randomUUID().slice(0, 8)}.wav`,
    );

    await this.ffmpeg.run([
      '-i',
      saved.filePath,
      '-ac',
      '1',
      '-ar',
      '24000',
      '-y',
      wavPath,
    ]);

    const duration = await this.ffmpeg.probeDurationSeconds(wavPath);
    if (duration < 5) {
      throw new BadRequestException(
        '参考音频至少 5 秒，建议上传 10–30 秒清晰人声',
      );
    }
    if (duration > 60) {
      throw new BadRequestException('参考音频不超过 60 秒');
    }

    const remoteRelative = `origin_audio/custom-${randomUUID().slice(0, 8)}.wav`;
    await this.gpuTransfer.uploadToVoiceData(wavPath, remoteRelative);

    const result = await this.duixTts.preprocessVoice({
      referenceAudioPath: remoteRelative,
      lang: 'zh',
    });

    if (!result.asrFormatAudioUrl || !result.referenceText) {
      throw new BadGatewayException('音色训练失败，GPU 未返回有效参考数据');
    }

    const voice = await this.customVoices.add(user.organizationId, {
      name: params.name?.trim() || '我的音色',
      referenceAudio: result.asrFormatAudioUrl,
      referenceText: result.referenceText,
    });

    return {
      id: voice.id,
      name: voice.name,
      tag: voice.tag,
    };
  }

  async trainVoice(params: {
    voiceId: string;
    referenceAudioPath: string;
    lang?: string;
  }) {
    this.requireDuix();
    const result = await this.duixTts.preprocessVoice({
      referenceAudioPath: params.referenceAudioPath,
      lang: params.lang,
    });
    return {
      voiceId: params.voiceId,
      referenceAudio: result.asrFormatAudioUrl,
      referenceText: result.referenceText,
      hint: `请将以下值写入 api/.env: DUIX_VOICE_${params.voiceId.replace('voice-', '').toUpperCase()}_REFERENCE_AUDIO 和 _REFERENCE_TEXT`,
    };
  }

  private async resolveSubtitleSegments(
    user: AuthUser,
    projectId: string,
    params: {
      subtitleSegments?: SubtitleSegment[];
      audioUrl?: string;
      script?: string;
    },
  ): Promise<SubtitleSegment[]> {
    const script = params.script?.trim();
    if (params.audioUrl?.trim()) {
      return this.subtitleAlignment.alignFromAudio(
        user.organizationId,
        projectId,
        params.audioUrl.trim(),
        script,
      );
    }

    if (script && (params.subtitleSegments?.length ?? 0) > 0) {
      const durationMs =
        params.subtitleSegments?.[params.subtitleSegments.length - 1]?.endMs ?? 0;
      return this.subtitleAlignment.applyScriptText(
        params.subtitleSegments ?? [],
        script,
        durationMs,
      );
    }

    return params.subtitleSegments ?? [];
  }
}
