import type { SubtitleSegment } from '../bailian/bailian.types';

export class DuixApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'DuixApiError';
  }
}

export interface AsrTranscriptionResult {
  script: string;
  subtitleSegments: SubtitleSegment[];
  durationMs?: number;
  model: string;
  hasWordTimestamps: boolean;
}

export interface DuixVoiceProfile {
  speaker: string;
  referenceAudio: string;
  referenceText: string;
  name: string;
  tag: string;
}

export interface DuixVideoSubmitResult {
  taskCode: string;
  remoteResultPath?: string;
}

export interface DuixVideoQueryResult {
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress?: number;
  message?: string;
  resultPath?: string;
}
