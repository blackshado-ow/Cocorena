"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { useMounted } from "@/hooks/use-mounted";

/** Renders children only after mount (avoids server/localStorage mismatch). */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const mounted = useMounted();
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

/* ---------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-[0.01em] transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-55";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-forest text-cream hover:bg-forest-soft",
  secondary: "bg-surface text-forest border border-line hover:bg-brown-wash/60",
  ghost: "text-forest hover:bg-palm-wash/70",
  danger: "bg-miss text-white hover:bg-[#9c3d38]",
  subtle: "bg-brown-wash text-brown-deep hover:bg-line",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className ?? ""}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

/* ----------------------------------- Card ---------------------------------- */

export function Card({ className, children }:
 { className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-lg border border-line bg-surface shadow-card ${className ?? ""}`}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action }:
 { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="font-display text-lg font-medium text-forest">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

const badgeTones = {
  palm: "bg-palm-wash text-palm-deep border border-palm-wash",
  brown: "bg-brown-wash text-brown-deep border border-brown-wash",
  terracotta: "bg-terracotta-wash text-terracotta border border-terracotta-wash",
  miss: "bg-miss-wash text-miss border border-miss-wash",
  neutral: "bg-transparent text-ink-soft border border-line",
} as const;

export function Badge({ tone = "neutral", children, className }:
 { tone?: keyof typeof badgeTones; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] ${badgeTones[tone]} ${className ?? ""}`}>
      {children}
    </span>
  );
}

/* -------------------------------- EmptyState -------------------------------- */

export function EmptyState({ icon, title, hint, action }: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line bg-cream/50 px-6 py-10 text-center">
      {icon ? <div className="text-palm" aria-hidden>{icon}</div> : null}
      <p className="font-display text-base font-medium text-forest">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-ink-soft">{hint}</p> : null}
      {action}
    </div>
  );
}

/* ---------------------------------- Field ---------------------------------- */

export function Field({ label, error, hint, htmlFor, children }: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-soft">{hint}</p> : null}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs font-medium text-miss">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputStyles =
  "rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 " +
  "focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest/25 disabled:opacity-60";

export function TextInput({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`${inputStyles} ${invalid ? "border-miss" : ""} ${className ?? ""}`} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputStyles} ${className ?? ""}`} {...props}>
      {children}
    </select>
  );
}

/* --------------------------------- Segmented --------------------------------- */

export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex flex-wrap gap-1 rounded-md bg-cream p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-forest ${
            value === o.value ? "bg-surface text-forest shadow-sm" : "text-ink-soft hover:text-forest"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- ProgressBar -------------------------------- */

export function ProgressBar({ fraction, label, showPercent = true }: { fraction: number; label: string; showPercent?: boolean }) {
  const pct = Math.min(100, Math.max(0, Math.round(fraction * 100)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden bg-palm-wash"
    >
      <div className="h-full bg-palm transition-all duration-500" style={{ width: `${pct}%` }} />
      {showPercent ? <span className="sr-only">{pct}%</span> : null}
    </div>
  );
}

/* ---------------------------------- Toggle ---------------------------------- */

export function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-md border border-line bg-surface px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
    >
      <span>
        <span className="block text-sm font-medium text-forest">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-ink-soft">{description}</span> : null}
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-forest" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

/* ---------------------------------- Dialog ---------------------------------- */

export function Dialog({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto rounded-lg border border-line bg-surface p-5 shadow-pop backdrop:bg-[#2a2318]/35 open:animate-rise"
    >
      {open ? (
        <>
          <div className="flex items-center justify-between gap-6">
            <h3 id="dialog-title" className="font-display text-lg font-medium text-forest">
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-ink-soft hover:bg-brown-wash focus-visible:outline-2 focus-visible:outline-forest"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="mt-3">{children}</div>
        </>
      ) : null}
    </dialog>
  );
}

/* --------------------------------- Spinner --------------------------------- */

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-ink-soft" role="status" aria-label={label}>
      <Loader2 className="animate-spin" size={20} aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}
