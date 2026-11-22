export interface SubtitleWord {
  beginMs: number;
  endMs: number;
  text: string;
}

export interface SubtitleSegment {
  beginMs: number;
  endMs: number;
  text: string;
  words?: SubtitleWord[];
}

export interface AsrTranscriptionResult {
  script: string;
  durationMs?: number;
  subtitleSegments: SubtitleSegment[];
  model: string;
  hasWordTimestamps: boolean;
}

export class BailianApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}
