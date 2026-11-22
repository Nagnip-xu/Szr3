import type { SubtitleSegment } from '../integrations/bailian/bailian.types';

export interface SubtitleStyleOptions {
  font?: string;
  size?: number;
  bottom?: number;
  color?: string;
  strokeColor?: string;
  stroke?: string;
  playResX?: number;
  playResY?: number;
}

export const SUBTITLE_PLAY_RES = {
  x: 720,
  y: 1280,
} as const;

export const SUBTITLE_MIN_ASS_FONT = 28;
export const SUBTITLE_ASS_SCALE = 6;
export const SUBTITLE_ASS_OUTLINE = 3;

function finiteNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSubtitleStyle(
  style: SubtitleStyleOptions = {},
): Required<Pick<SubtitleStyleOptions, 'size' | 'bottom'>> &
  SubtitleStyleOptions {
  const size = finiteNumber(style.size, 8);
  const bottom = finiteNumber(style.bottom, 60);
  return {
    ...style,
    size: clamp(size, 1, 80),
    bottom: clamp(bottom, 0, 600),
    strokeColor:
      style.strokeColor ??
      (typeof style.stroke === 'string' ? style.stroke : undefined),
  };
}

function hexToAssColor(hex: string) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return '&H00FFFFFF';
  const r = normalized.slice(0, 2);
  const g = normalized.slice(2, 4);
  const b = normalized.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

function msToAss(ms: number) {
  const totalCs = Math.max(0, Math.round(ms / 10));
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function buildAssContent(
  segments: SubtitleSegment[],
  style: SubtitleStyleOptions = {},
) {
  const normalized = normalizeSubtitleStyle(style);
  const playResX = Math.max(1, finiteNumber(normalized.playResX, SUBTITLE_PLAY_RES.x));
  const playResY = Math.max(1, finiteNumber(normalized.playResY, SUBTITLE_PLAY_RES.y));
  const fontSize = Math.max(
    SUBTITLE_MIN_ASS_FONT,
    Math.round(normalized.size * SUBTITLE_ASS_SCALE),
  );
  const marginV = normalized.bottom;
  const primary = hexToAssColor(normalized.color ?? '#FFFFFF');
  const outline = hexToAssColor(normalized.strokeColor ?? '#000000');
  const fontName = 'Noto Sans CJK SC';

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primary},&H000000FF,${outline},&H80000000,0,0,0,0,100,100,0,0,1,${SUBTITLE_ASS_OUTLINE},0,2,40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const dialogues = segments
    .filter((seg) => seg.text?.trim())
    .map(
      (seg) =>
        `Dialogue: 0,${msToAss(seg.beginMs)},${msToAss(seg.endMs)},Default,,0,0,0,,${seg.text.trim().replace(/\n/g, '\\N')}`,
    );

  return `${header}\n${dialogues.join('\n')}\n`;
}
