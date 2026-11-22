import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DuixEndpointService } from './duix-endpoint.service';
import { CustomVoiceService } from './custom-voice.service';
import { DuixApiError } from './duix.types';
import { resolveDuixVoice } from './duix-voices';

export interface DuixTtsResult {
  wavBuffer: Buffer;
  duration: number;
  model: string;
  voice: string;
}

@Injectable()
export class DuixTtsService {
  private get apiBase() {
    return this.endpoints.ttsBaseUrl();
  }

  constructor(
    private readonly endpoints: DuixEndpointService,
    private readonly customVoices: CustomVoiceService,
  ) {}

  isConfigured() {
    return !!this.apiBase;
  }

  /**
   * Fish-Speech TTS：返回 WAV 二进制
   * @see Duix.Avatar README /v1/invoke
   */
  async synthesize(params: {
    text: string;
    voiceId: string;
    organizationId?: string;
  }): Promise<DuixTtsResult> {
    if (!this.isConfigured()) {
      throw new DuixApiError('未配置 DUIX_TTS_API');
    }

    const text = params.text.trim();
    if (!text) {
      throw new DuixApiError('配音文本不能为空');
    }

    const profile = await this.resolveProfile(
      params.voiceId,
      params.organizationId,
    );

    const res = await fetch(`${this.apiBase}/v1/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speaker: profile.speaker,
        text,
        format: 'wav',
        topP: 0.7,
        max_new_tokens: 1024,
        chunk_length: 100,
        repetition_penalty: 1.2,
        temperature: 0.7,
        need_asr: false,
        streaming: false,
        is_fixed_seed: 0,
        is_norm: 1,
        reference_audio: profile.referenceAudio,
        reference_text: profile.referenceText,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new DuixApiError(this.formatTtsError(errText, res.status), res.status);
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await res.json()) as { code?: number; msg?: string; message?: string };
      throw new DuixApiError(
        this.formatTtsError(body.msg ?? body.message ?? JSON.stringify(body)),
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const wavBuffer = Buffer.from(arrayBuffer);
    if (wavBuffer.length < 44) {
      throw new DuixApiError('HeyGem TTS 返回的音频数据无效');
    }

    const duration = this.estimateWavDuration(wavBuffer);

    return {
      wavBuffer,
      duration,
      model: 'heygem-fish-speech',
      voice: profile.name,
    };
  }

  /** 训练克隆音（可选，部署时预置参考音频后调用一次） */
  async preprocessVoice(params: {
    referenceAudioPath: string;
    lang?: string;
  }) {
    if (!this.isConfigured()) {
      throw new DuixApiError('未配置 DUIX_TTS_API');
    }

    const res = await fetch(`${this.apiBase}/v1/preprocess_and_tran`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'wav',
        reference_audio: params.referenceAudioPath,
        lang: params.lang ?? 'zh',
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      code?: number;
      msg?: string;
      asr_format_audio_url?: string;
      reference_audio_text?: string;
    };

    if (!res.ok || body.code !== 0) {
      throw new DuixApiError(body.msg ?? `HeyGem 音色训练失败 (${res.status})`);
    }

    return {
      asrFormatAudioUrl: body.asr_format_audio_url ?? '',
      referenceText: body.reference_audio_text ?? '',
      speaker: randomUUID(),
    };
  }

  private estimateWavDuration(buffer: Buffer) {
    try {
      const dataOffset = 44;
      const byteRate = buffer.readUInt32LE(28);
      const dataSize = buffer.length - dataOffset;
      if (byteRate > 0 && dataSize > 0) {
        return Math.max(1, Math.round(dataSize / byteRate));
      }
    } catch {
      /* fallback */
    }
    return Math.max(1, Math.round(buffer.length / 32_000));
  }

  private async resolveProfile(voiceId: string, organizationId?: string) {
    if (organizationId && voiceId.startsWith('custom-')) {
      const custom = await this.customVoices.get(organizationId, voiceId);
      if (custom) return custom;
      throw new DuixApiError('自定义音色不存在，请重新训练');
    }
    return resolveDuixVoice(voiceId);
  }

  private formatTtsError(raw: string, status?: number) {
    if (
      raw.includes('No such file') ||
      raw.includes('428') ||
      raw.includes('cosyvoice')
    ) {
      return (
        'HeyGem 克隆音未就绪：请先在 GPU 上训练参考音频。' +
        '运行 npm run bootstrap:voice（在 api 目录），或调用 POST /workflow/train-voice'
      );
    }
    return raw || `HeyGem TTS 合成失败${status ? ` (${status})` : ''}`;
  }
}
