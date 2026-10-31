import { Sprig } from "@/components/palm/PalmArt";
import type { ReactNode } from "react";

export function PageHeading({ title, subtitle, eyebrow, sprig = true, children }: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  sprig?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex flex-col gap-1">
        {eyebrow ? <p className="eyebrow text-brown">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-medium text-forest md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">{subtitle}</p> : null}
        {children}
      </div>
      {sprig ? <Sprig className="mt-2 hidden h-12 w-12 shrink-0 opacity-70 lg:block" /> : null}
    </div>
  );
}
