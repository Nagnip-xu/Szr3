"use client";

import { useState } from "react";
import { withAuthToken } from "@/lib/api/asset-url";
import { cn } from "@/lib/utils";
import type { AvatarOption } from "@/lib/types/project";
import { AvatarDetailDialog } from "@/components/workflow/AvatarDetailDialog";
import { Trash2 } from "lucide-react";
import Image from "next/image";

export function AvatarPicker({
  avatars,
  value,
  onChange,
  onDelete,
}: {
  avatars: (AvatarOption & { tag?: string; referenceVideo?: string })[];
  value: string;
  onChange: (avatar: AvatarOption & { tag?: string; referenceVideo?: string }) => void;
  onDelete?: (avatar: AvatarOption & { tag?: string; referenceVideo?: string }) => void;
}) {
  const [detailAvatar, setDetailAvatar] = useState<
    (AvatarOption & { tag?: string; referenceVideo?: string }) | null
  >(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#9eb0c8]">我的数字人</p>
        {avatars.length > 0 && (
          <p className="text-[10px] text-[#5a6a82]">双击卡片放大播放</p>
        )}
      </div>
      {avatars.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-[#0a0f18]/40 px-3 py-6 text-center text-[11px] leading-relaxed text-[#5a6a82]">
          暂无已保存的数字人
          <br />
          请在上方上传 5–30 秒正脸口播参考视频并保存
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {avatars.map((avatar) => {
            const selected = value === avatar.id;
            const thumbSource = avatar.preview;
            const thumb = withAuthToken(thumbSource) ?? thumbSource;
            return (
              <div key={avatar.id} className="relative aspect-[3/4]">
                <button
                  type="button"
                  onClick={() => onChange(avatar)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    setDetailAvatar(avatar);
                  }}
                  title="单击选中 · 双击放大播放"
                  className={cn(
                    "group relative size-full overflow-hidden rounded-lg border-2 bg-[#0a0f18] text-left transition",
                    selected
                      ? "border-[#3b82f6] shadow-[0_0_0_1px_rgba(59,130,246,0.35)]"
                      : "border-white/10 hover:border-white/25",
                  )}
                >
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={avatar.name}
                      fill
                      className="object-cover transition group-hover:scale-[1.02]"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[10px] text-[#5a6a82]">
                      无预览
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-1.5 pb-1.5 pt-6">
                    <p className="truncate text-[10px] font-medium text-white">
                      {avatar.name}
                    </p>
                    {avatar.tag && (
                      <p className="truncate text-[9px] text-white/60">
                        {avatar.tag}
                      </p>
                    )}
                  </div>
                  {selected && (
                    <div className="absolute right-1.5 top-1.5 rounded-full bg-[#3b82f6] px-1.5 py-0.5 text-[9px] text-white">
                      已选
                    </div>
                  )}
                </button>

                {onDelete && avatar.id.startsWith("custom-") && (
                  <button
                    type="button"
                    aria-label={`删除数字人 ${avatar.name}`}
                    title="删除数字人"
                    onClick={() => onDelete(avatar)}
                    className={cn(
                      "absolute left-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white/70 shadow-[0_8px_18px_rgba(0,0,0,0.28)] backdrop-blur-sm transition",
                      "hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f18]",
                    )}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AvatarDetailDialog
        avatar={detailAvatar}
        open={!!detailAvatar}
        onClose={() => setDetailAvatar(null)}
      />
    </div>
  );
}
