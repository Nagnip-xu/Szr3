import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-[var(--text-secondary)]"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          "h-9 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--foreground)]",
          "placeholder:text-[var(--text-muted)] transition-colors duration-200",
          "hover:border-[var(--border-strong)] focus:border-[var(--accent-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dim)]",
          className,
        )}
        {...props}
      />
      {hint && <p className="text-[11px] text-[#5a6a82]">{hint}</p>}
    </div>
  ),
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => (
    <div className="flex flex-1 flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[#8b9cb3]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "min-h-[120px] flex-1 w-full resize-none rounded-lg border border-white/[0.08] bg-[#0a0f18]/80 px-3 py-2.5 text-sm leading-relaxed text-[#d4dce8]",
          "placeholder:text-[#4a5568] transition-colors duration-200",
          "hover:border-white/12 focus:border-[#3b82f6]/50 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[#8b9cb3]">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-white/[0.08] bg-[#0a0f18]/80 px-3 text-sm text-[#e8edf5]",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238b9cb3%27 stroke-width=%272%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[position:right_10px_center] bg-no-repeat pr-8",
          "hover:border-white/12 focus:border-[#3b82f6]/50 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20",
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#141c2b]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
);
Select.displayName = "Select";

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function Checkbox({ label, checked, onChange, id }: CheckboxProps) {
  const checkboxId = id ?? label;
  return (
    <label
      htmlFor={checkboxId}
      className="flex cursor-pointer items-center gap-2 text-xs text-[#94a3b8] hover:text-[#c8d4e8]"
    >
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 rounded border-white/20 bg-[#0a0f18] text-[#3b82f6] focus:ring-[#3b82f6]/30"
      />
      {label}
    </label>
  );
}

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[#8b9cb3]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-8 cursor-pointer rounded-md border border-white/10 bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#0a0f18]/80 px-2 text-xs font-mono text-[#c8d4e8] focus:border-[#3b82f6]/50 focus:outline-none"
        />
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (v: number) => string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  format = (v) => String(v),
}: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#8b9cb3]">{label}</span>
        <span className="rounded bg-[#1a2332] px-2 py-0.5 text-xs font-mono text-[#7eb8ff]">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#1a2332] accent-[#3b82f6]"
      />
    </div>
  );
}

interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function RadioGroup({ name, value, onChange, options }: RadioGroupProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-2 text-xs text-[#94a3b8]"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="size-3.5 border-white/20 bg-[#0a0f18] text-[#c9922e] focus:ring-[#c9922e]/30"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
