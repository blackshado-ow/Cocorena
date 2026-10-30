"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer, Hourglass, TimerReset } from "lucide-react";

const MODES = [
  { href: "/focus", label: "Pomodoro", icon: Timer },
  { href: "/stopwatch", label: "Stopwatch", icon: TimerReset },
  { href: "/countdown", label: "Countdown", icon: Hourglass },
];

export function TimerSwitcher() {
  const pathname = usePathname();
  return (
    <nav aria-label="Timer modes" className="flex flex-wrap gap-2">
      {MODES.map((m) => {
        const active = pathname === m.href;
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm ${
              active ? "bg-forest text-cream" : "border border-line bg-surface text-forest hover:bg-brown-wash"
            }`}
          >
            <m.icon size={15} aria-hidden /> {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
