"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";

export function FileUploadButton({
  label,
  accept,
  disabled,
  onSelect,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  onSelect: (file: File) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onSelect(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-[#0a0f18]/40 py-3 text-xs text-[#7a8ba0] transition hover:border-[#3b82f6]/40 hover:text-[#7eb8ff] disabled:opacity-50"
      >
        <Upload className="size-4" />
        {label}
      </button>
    </>
  );
}
