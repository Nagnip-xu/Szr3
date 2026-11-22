"use client";

import { AvatarDetailDialog } from "@/components/workflow/AvatarDetailDialog";
import { Dialog } from "@/components/ui/Dialog";
import { withAuthToken } from "@/lib/api/asset-url";
import type { AvatarOption } from "@/lib/types/project";
import { cn } from "@/lib/utils";
import { Images, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type PickerAvatar = AvatarOption & { tag?: string; referenceVideo?: string };

function AvatarCard({ avatar, selected, onSelect, onOpen, onDelete }: {
  avatar: PickerAvatar;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const thumbSource = avatar.preview;
  const thumb = withAuthToken(thumbSource) ?? thumbSource;
  return (
    <div className="relative aspect-[3/4]">
      <button type="button" onClick={onSelect} onDoubleClick={(event) => { event.preventDefault(); onOpen(); }} title="单击选中，双击查看详情" className={cn("group relative size-full overflow-hidden rounded-lg border-2 bg-[#0a0f18] text-left transition", selected ? "border-[#3b82f6] shadow-[0_0_0_1px_rgba(59,130,246,0.35)]" : "border-white/10 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50")}>
        {thumb ? <Image src={thumb} alt={avatar.name} fill className="object-cover transition group-hover:scale-[1.02]" unoptimized /> : <div className="flex size-full items-center justify-center text-[10px] text-[#5a6a82]">无预览</div>}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-1.5 pb-1.5 pt-6">
          <p className="truncate text-[10px] font-medium text-white">{avatar.name}</p>
          {avatar.tag && <p className="truncate text-[9px] text-white/60">{avatar.tag}</p>}
        </div>
        {selected && <div className="absolute right-1.5 top-1.5 rounded-full bg-[#3b82f6] px-1.5 py-0.5 text-[9px] text-white">已选</div>}
      </button>
      {onDelete && <button type="button" aria-label={`删除数字人 ${avatar.name}`} title="删除数字人" onClick={onDelete} className="absolute left-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white/70 shadow-[0_8px_18px_rgba(0,0,0,0.28)] backdrop-blur-sm transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"><Trash2 className="size-3.5" /></button>}
    </div>
  );
}

export function AvatarPicker({ avatars, value, onChange, onDelete }: {
  avatars: PickerAvatar[];
  value: string;
  onChange: (avatar: PickerAvatar) => void;
  onDelete?: (avatar: PickerAvatar) => void;
}) {
  const [detailAvatar, setDetailAvatar] = useState<PickerAvatar | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visibleAvatars = avatars.slice(0, 3);
  const choose = (avatar: PickerAvatar) => { onChange(avatar); setShowAll(false); };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#9eb0c8]">我的数字人</p>
        {avatars.length > 0 && <p className="text-[10px] text-[#5a6a82]">双击卡片查看详情</p>}
      </div>
      {avatars.length === 0 ? <div className="rounded-lg border border-dashed border-white/10 bg-[#0a0f18]/40 px-3 py-6 text-center text-[11px] leading-relaxed text-[#5a6a82]">暂无已保存的数字人<br />请在上方上传并保存参考口播视频</div> : <>
        <div className="grid grid-cols-3 gap-2">
          {visibleAvatars.map((avatar) => <AvatarCard key={avatar.id} avatar={avatar} selected={value === avatar.id} onSelect={() => choose(avatar)} onOpen={() => setDetailAvatar(avatar)} onDelete={onDelete && avatar.id.startsWith("custom-") ? () => onDelete(avatar) : undefined} />)}
        </div>
        {avatars.length > 3 && <button type="button" onClick={() => setShowAll(true)} className="flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-[#141c2b] px-3 py-2 text-xs font-medium text-[#b9c8dc] transition hover:border-[#3b82f6]/45 hover:bg-[#19243a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50"><Images className="size-3.5" />查看所有数字人（{avatars.length}）</button>}
      </>}

      <Dialog open={showAll} onClose={() => setShowAll(false)} showClose ariaLabel="选择数字人" className="max-w-3xl">
        <div className="mb-5 pr-8"><h2 className="text-base font-semibold text-[var(--foreground)]">所有数字人</h2><p className="mt-1 text-xs text-[var(--text-muted)]">单击选择，双击查看参考视频</p></div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {avatars.map((avatar) => <AvatarCard key={avatar.id} avatar={avatar} selected={value === avatar.id} onSelect={() => choose(avatar)} onOpen={() => { setShowAll(false); setDetailAvatar(avatar); }} onDelete={onDelete && avatar.id.startsWith("custom-") ? () => { setShowAll(false); onDelete(avatar); } : undefined} />)}
        </div>
      </Dialog>

      <AvatarDetailDialog avatar={detailAvatar} open={!!detailAvatar} onClose={() => setDetailAvatar(null)} />
    </div>
  );
}
