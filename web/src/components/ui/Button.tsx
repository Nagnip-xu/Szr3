import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-white border border-[var(--accent-bright)]/30 shadow-[0_8px_24px_rgba(79,124,255,0.25)] hover:brightness-110 active:scale-[0.98]",
  secondary:
    "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-white/[0.03]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-white/5 border border-transparent",
  outline:
    "bg-transparent text-[var(--accent-bright)] border border-[var(--accent-ring)] hover:bg-[var(--accent-dim)]",
  danger:
    "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2 font-medium",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      loading,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
