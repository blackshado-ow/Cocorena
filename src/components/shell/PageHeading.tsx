import type { ReactNode } from "react";

export function PageHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold text-forest">{title}</h1>
      {subtitle ? <p className="max-w-2xl text-sm text-ink-soft">{subtitle}</p> : null}
      {children}
    </div>
  );
}
