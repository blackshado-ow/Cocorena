"use client";

import Link from "next/link";
import { PalmTree } from "@/components/palm/PalmArt";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <PalmTree coconuts={0} className="h-40" />
      <h1 className="text-2xl font-semibold text-forest">This path inland is not on the map</h1>
      <p className="max-w-sm text-sm text-ink-soft">
        The page you&apos;re after doesn&apos;t exist. The grove, however, is right where you left it.
      </p>
      <div className="flex gap-2">
        <Link href="/" className="rounded-xl bg-palm px-4 py-2.5 text-sm font-medium text-cream hover:bg-palm-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm">
          Back to dashboard
        </Link>
        <Link href="/focus-corner" className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-forest hover:bg-brown-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm">
          Focus Corner
        </Link>
      </div>
    </div>
  );
}
