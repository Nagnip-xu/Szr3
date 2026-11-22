"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  loading = false,
  variant = "default",
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";

  return (
    <Dialog
      open={open}
      onClose={loading ? () => undefined : onClose}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      ariaLabel={title}
    >
      <div className="flex gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            isDanger
              ? "bg-red-500/12 text-red-400 ring-1 ring-red-500/20"
              : "bg-[var(--accent-dim)] text-[var(--accent-bright)] ring-1 ring-[var(--accent-ring)]",
          )}
        >
          <AlertTriangle className="size-5" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-base font-semibold leading-snug text-[var(--foreground)]">
            {title}
          </h2>
          {description && (
            <div className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {description}
            </div>
          )}
        </div>
      </div>

      {isDanger && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-red-500/15 bg-red-500/5 px-3.5 py-3 text-xs leading-relaxed text-red-300/90">
          删除后无法恢复，请确认该项目不再需要。
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={isDanger ? "danger" : "primary"}
          size="sm"
          loading={loading}
          onClick={() => void onConfirm()}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
