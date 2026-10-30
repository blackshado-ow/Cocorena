"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Cocorena render error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-4xl" aria-hidden>
        🥥
      </p>
      <h1 className="text-2xl font-semibold text-forest">A coconut fell on the wiring</h1>
      <p className="max-w-md text-sm text-ink-soft">
        Something went wrong rendering this page. Your data is safe on this device — try again, or head back to the dashboard.
      </p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-palm px-4 py-2.5 text-sm font-medium text-cream hover:bg-palm-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm"
        >
          <RefreshCw size={15} aria-hidden /> Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-forest hover:bg-brown-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
