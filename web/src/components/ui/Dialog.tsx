"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showClose?: boolean;
  ariaLabel?: string;
}

export function Dialog({
  open,
  onClose,
  children,
  className,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showClose = false,
  ariaLabel,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, closeOnEscape]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "relative z-[101] mx-auto w-full max-w-md animate-fade-up rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-[var(--radius-md)] p-1.5 text-[var(--text-muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
