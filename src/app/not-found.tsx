"use client";

import Link from "next/link";
import { PalmTree } from "@/components/palm/PalmArt";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center">
      <PalmTree coconuts={0} className="h-40" />
      <p className="eyebrow text-brown">404</p>
      <h1 className="font-display text-3xl font-medium text-forest md:text-4xl">This path inland is not on the map</h1>
      <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
        The page you&apos;re after doesn&apos;t exist. The grove, however, is right where you left it.
      </p>
      <div className="flex gap-2.5">
        <Link
          href="/"
          className="rounded-md bg-forest px-4 py-2.5 text-sm font-medium text-cream hover:bg-forest-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          Back to dashboard
        </Link>
        <Link
          href="/focus-corner"
          className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-forest hover:bg-brown-wash/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          Focus Corner
        </Link>
      </div>
    </div>
  );
}
