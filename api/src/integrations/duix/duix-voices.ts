import type { DuixVoiceProfile } from './duix.types';

/**
 * Fish-Speech 克隆音配置：reference_audio / reference_text 为 GPU 上
 * ~/duix_avatar_data/voice/data 目录内的相对路径（需先调用 preprocess_and_tran 训练）。
 * 可通过环境变量覆盖默认音色。
 */
export const DUIX_VOICE_PROFILES: Record<string, DuixVoiceProfile> = {
  'voice-001': {
    speaker: 'szr3-voice-001',
    referenceAudio:
      process.env.DUIX_VOICE_001_REFERENCE_AUDIO?.trim() ??
      'origin_audio/default_male.wav',
    referenceText:
      process.env.DUIX_VOICE_001_REFERENCE_TEXT?.trim() ??
      '大家好，欢迎收看本期口播视频。',
    name: '默认男声',
    tag: 'HeyGem 克隆音',
  },
  'voice-002': {
    speaker: 'szr3-voice-002',
    referenceAudio:
      process.env.DUIX_VOICE_002_REFERENCE_AUDIO?.trim() ??
      'origin_audio/default_female.wav',
    referenceText:
      process.env.DUIX_VOICE_002_REFERENCE_TEXT?.trim() ??
      '大家好，欢迎收看本期口播视频。',
    name: '默认女声',
    tag: 'HeyGem 克隆音',
  },
  'voice-003': {
    speaker: 'szr3-voice-003',
    referenceAudio:
      process.env.DUIX_VOICE_003_REFERENCE_AUDIO?.trim() ??
      'origin_audio/default_male.wav',
    referenceText:
      process.env.DUIX_VOICE_003_REFERENCE_TEXT?.trim() ??
      '大家好，欢迎收看本期口播视频。',
    name: '阳光男声',
    tag: 'HeyGem 克隆音',
  },
  'voice-004': {
    speaker: 'szr3-voice-004',
    referenceAudio:
      process.env.DUIX_VOICE_004_REFERENCE_AUDIO?.trim() ??
      'origin_audio/default_female.wav',
    referenceText:
      process.env.DUIX_VOICE_004_REFERENCE_TEXT?.trim() ??
      '大家好，欢迎收看本期口播视频。',
    name: '元气女声',
    tag: 'HeyGem 克隆音',
  },
};

export function resolveDuixVoice(voiceId: string): DuixVoiceProfile {
  return DUIX_VOICE_PROFILES[voiceId] ?? DUIX_VOICE_PROFILES['voice-001'];
}
