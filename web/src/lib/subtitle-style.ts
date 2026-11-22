export const SUBTITLE_PLAY_RES = {
  x: 720,
  y: 1280,
} as const;

export const SUBTITLE_MIN_ASS_FONT = 28;
export const SUBTITLE_ASS_SCALE = 6;
export const SUBTITLE_ASS_OUTLINE = 3;

function finiteNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export interface ResolvedSubtitleStyle {
  uiSize: number;
  uiBottom: number;
  assFontSize: number;
  marginV: number;
  playResX: number;
  playResY: number;
}

export function resolveSubtitleStyle(
  size: unknown,
  bottom: unknown,
  playRes?: { x?: number; y?: number },
): ResolvedSubtitleStyle {
  const uiSize = clamp(finiteNumber(size, 8), 1, 80);
  const uiBottom = clamp(finiteNumber(bottom, 60), 0, 600);
  const playResX = Math.max(1, finiteNumber(playRes?.x, SUBTITLE_PLAY_RES.x));
  const playResY = Math.max(1, finiteNumber(playRes?.y, SUBTITLE_PLAY_RES.y));
  return {
    uiSize,
    uiBottom,
    assFontSize: Math.max(
      SUBTITLE_MIN_ASS_FONT,
      Math.round(uiSize * SUBTITLE_ASS_SCALE),
    ),
    marginV: uiBottom,
    playResX,
    playResY,
  };
}

export function previewSubtitleMetrics(
  style: Pick<ResolvedSubtitleStyle, "assFontSize" | "marginV" | "playResY">,
  frameHeightPx: number,
) {
  const scale = frameHeightPx / style.playResY;
  return {
    fontSizePx: Math.max(10, style.assFontSize * scale),
    bottomPx: Math.max(4, style.marginV * scale),
    outlinePx: Math.max(1, SUBTITLE_ASS_OUTLINE * scale),
  };
}

export function normalizeSubtitleStyleInput(
  style: Record<string, unknown> = {},
): {
  font?: string;
  size: number;
  bottom: number;
  color?: string;
  strokeColor?: string;
  playResX?: number;
  playResY?: number;
} {
  const size = Number(style.size);
  const bottom = Number(style.bottom);
  const playResX = Number(style.playResX);
  const playResY = Number(style.playResY);
  const strokeColor =
    typeof style.strokeColor === "string"
      ? style.strokeColor
      : typeof style.stroke === "string"
        ? style.stroke
        : undefined;

  return {
    font: typeof style.font === "string" ? style.font : undefined,
    size: Number.isFinite(size) ? size : 8,
    bottom: Number.isFinite(bottom) ? bottom : 60,
    color: typeof style.color === "string" ? style.color : undefined,
    strokeColor,
    playResX: Number.isFinite(playResX) ? playResX : undefined,
    playResY: Number.isFinite(playResY) ? playResY : undefined,
  };
}
