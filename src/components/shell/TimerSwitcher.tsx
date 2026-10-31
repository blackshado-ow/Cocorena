"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MODES = [
  { href: "/focus", label: "Pomodoro" },
  { href: "/stopwatch", label: "Stopwatch" },
  { href: "/countdown", label: "Countdown" },
];

/** Editorial underline tabs shared by the three timer pages. */
export function TimerSwitcher() {
  const pathname = usePathname();
  return (
    <nav aria-label="Timer modes" className="border-b border-line">
      <ul className="-mb-px flex gap-6">
        {MODES.map((m) => {
          const active = pathname === m.href;
          return (
            <li key={m.href}>
              <Link
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block border-b-2 pb-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
                  active
                    ? "border-forest text-forest"
                    : "border-transparent text-ink-soft hover:border-line hover:text-forest"
                }`}
              >
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
