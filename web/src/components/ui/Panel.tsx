import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PanelProps {
  step?: number;
  title: string;
  children: ReactNode;
  className?: string;
  badge?: string;
  completed?: boolean;
}

export function Panel({
  step,
  title,
  children,
  className,
  badge,
  completed,
}: PanelProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]",
        className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-4 py-3.5">
        {step != null && (
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-semibold",
              completed
                ? "bg-[var(--success)]/15 text-[var(--success)]"
                : "bg-[var(--accent-dim)] text-[var(--accent-bright)]",
            )}
          >
            {step}
          </span>
        )}
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {badge && (
          <span className="ml-auto rounded-full bg-[var(--accent-dim)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--accent-bright)]">
            {badge}
          </span>
        )}
      </header>
      <div className="flex flex-1 flex-col gap-3 p-4">{children}</div>
    </section>
  );
}
