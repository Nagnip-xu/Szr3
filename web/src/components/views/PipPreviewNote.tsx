import type { PipConfig } from "@/lib/types/pip";

const positionClass: Record<string, string> = {
  "top-left": "left-[8%] top-[8%]",
  "top-right": "right-[8%] top-[8%]",
  "bottom-left": "left-[8%] bottom-[12%]",
  "bottom-right": "right-[8%] bottom-[12%]",
  center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
};

export function PipPreviewNote({ pip }: { pip: PipConfig }) {
  if (!pip.enabled) return null;

  return (
    <div
      className={`absolute overflow-hidden border-2 border-[#3b82f6]/60 bg-[#141c2b]/90 shadow-[0_4px_20px_rgba(59,130,246,0.3)] ${positionClass[pip.position]}`}
      style={{
        width: `${pip.scale * 100}%`,
        aspectRatio: "16/9",
        borderRadius: pip.borderRadius,
        opacity: pip.opacity,
      }}
    >
      <div className="flex h-full flex-col items-center justify-center p-1 text-center">
        <span className="text-[10px] font-medium text-[#7eb8ff]">
          {pip.assetTag}
        </span>
        <span className="text-[8px] text-[#5a6a82]">
          {pip.startSec}s · {pip.durationSec}s
        </span>
      </div>
    </div>
  );
}
