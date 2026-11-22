import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ExtractScriptDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}

export class RewriteScriptDto {
  @IsString()
  script: string;

  @IsString()
  mode: 'auto' | 'custom';

  @IsOptional()
  @IsString()
  customPrompt?: string;
}

export class GenerateAudioDto {
  @IsString()
  text: string;

  @IsString()
  voiceId: string;

  @IsNumber()
  rate: number;

  @IsOptional()
  @IsString()
  projectId?: string;
}

export class GenerateDigitalHumanDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  avatarId: string;

  @IsString()
  audioUrl: string;

  @IsOptional()
  @IsString()
  referenceVideoUrl?: string;
}

export class GenerateSubtitlesDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  videoUrl: string;

  @IsString()
  script: string;

  @IsObject()
  style: Record<string, unknown>;

  @IsOptional()
  subtitleSegments?: unknown[];

  @IsOptional()
  @IsString()
  audioUrl?: string;
}

export class GenerateBgmDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  videoUrl: string;

  @IsNumber()
  volume: number;

  @IsOptional()
  @IsString()
  bgmUrl?: string;
}

export class RenderFinalDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  videoUrl: string;

  @IsOptional()
  subtitleSegments?: unknown[];

  @IsOptional()
  @IsObject()
  style?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  bgmUrl?: string;

  @IsOptional()
  @IsNumber()
  bgmVolume?: number;

  @IsOptional()
  @IsBoolean()
  useBgm?: boolean;

  @IsOptional()
  @IsBoolean()
  addAiWatermark?: boolean;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  script?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  pip?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsBoolean()
  publishWithCover?: boolean;
}

export class GenerateTitleDto {
  @IsString()
  script: string;
}

export class GenerateCoverDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  text: string;

  @IsObject()
  style: Record<string, unknown>;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  baseImageUrl?: string;
}

export class ApplyPipDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  videoUrl: string;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  assetUrl?: string;

  @IsOptional()
  @IsString()
  assetTag?: string;

  @IsString()
  position: string;

  @IsNumber()
  @Min(0.1)
  scale: number;

  @IsNumber()
  @Min(0)
  opacity: number;

  @IsNumber()
  @Min(0)
  startSec: number;

  @IsNumber()
  @Min(0)
  durationSec: number;

  @IsNumber()
  @Min(0)
  borderRadius: number;
}

export class TrainCustomVoiceDto {
  @IsString()
  projectId: string;

  @IsString()
  audioUrl: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  consentId: string;
}

export class SaveCustomAvatarDto {
  @IsString()
  projectId: string;

  @IsString()
  videoUrl: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  consentId: string;
}
