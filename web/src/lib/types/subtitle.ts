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

export function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const centi = Math.floor((ms % 1000) / 10);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(centi).padStart(2, "0")}`;
}
