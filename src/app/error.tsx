"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { LogoMark, Sprig } from "@/components/palm/PalmArt";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Cocorena render error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center">
      <div className="relative">
        <Sprig className="pointer-events-none absolute -left-10 -top-3 h-14 w-14 -rotate-[20deg] opacity-60" flip />
        <LogoMark size={56} />
      </div>
      <p className="eyebrow text-brown">Something went wrong</p>
      <h1 className="font-display text-3xl font-medium text-forest md:text-4xl">A coconut fell on the wiring</h1>
      <p className="max-w-md text-sm leading-relaxed text-ink-soft">
        Something went wrong rendering this page. Your data is safe on this device — try again, or head back to the dashboard.
      </p>
      <div className="flex gap-2.5">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2.5 text-sm font-medium text-cream hover:bg-forest-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          <RefreshCw size={15} aria-hidden /> Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-forest hover:bg-brown-wash/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
