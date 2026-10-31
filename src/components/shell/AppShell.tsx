"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { LogoMark } from "@/components/palm/PalmArt";
import { useCloudUser } from "@/lib/supabase/auth-state";

const NAV = [
  { href: "/", label: "Dashboard", group: "Overview" },
  { href: "/focus", label: "Focus", group: "Timers" },
  { href: "/stopwatch", label: "Stopwatch", group: "Timers" },
  { href: "/countdown", label: "Countdown", group: "Timers" },
  { href: "/tasks", label: "Tasks", group: "Practices" },
  { href: "/garden", label: "Garden", group: "Practices" },
  { href: "/groups", label: "Groups", group: "Practices" },
  { href: "/focus-corner", label: "Focus Corner", group: "Practices" },
  { href: "/settings", label: "Settings", group: "Overview" },
] as const;

function NavLink({ href, label, active, onNavigate }: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`-mb-px inline-flex items-center border-b-2 px-0.5 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-forest ${
        active
          ? "border-forest font-medium text-forest"
          : "border-transparent text-ink-soft hover:border-brown/45 hover:text-forest"
      }`}
    >
      {label}
    </Link>
  );
}

function GuestChip({ className = "" }: { className?: string }) {
  return (
    <span title="Guest mode — data lives in this browser">
      <span className={`inline-flex items-center gap-1.5 rounded-md border border-cream/25 bg-cream/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-cream/85 ${className}`}>
        Guest mode
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { configured, loading, user } = useCloudUser();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-forest"
      >
        Skip to content
      </a>

      {/* Editorial masthead: warm ivory, hairline rule, serif wordmark */}
      <header className="sticky top-0 z-40 border-b border-line bg-cream/95 supports-[backdrop-filter]:bg-cream/85 supports-[backdrop-filter]:backdrop-blur-[2px]">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-stretch px-4 md:h-16 md:px-6">
          <Link
            href="/"
            className="my-auto flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest"
            aria-label="Cocorena home"
          >
            <LogoMark size={30} />
            <span className="font-display text-xl font-semibold tracking-tight text-forest">Cocorena</span>
          </Link>

          <nav aria-label="Primary" className="my-auto hidden h-full items-stretch gap-5 md:my-0 md:flex">
            {NAV.slice(0, 8).map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
            ))}
          </nav>

          <div className="my-auto flex items-center gap-2">
            {configured ? (
              user ? (
                <Link
                  href="/settings"
                  className="hidden rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-forest hover:bg-brown-wash/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest md:inline-flex"
                >
                  Account
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="hidden rounded-md bg-forest px-3.5 py-1.5 text-sm font-medium text-cream hover:bg-forest-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest md:inline-flex"
                >
                  Sign in
                </Link>
              )
            ) : (
              <span className="hidden md:block">
                <GuestChip />
              </span>
            )}
            <button
              className="rounded-md p-2 text-forest hover:bg-brown-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </div>

        {/* Mobile sheet: grouped links, hairline rules */}
        {menuOpen ? (
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="animate-fade border-t border-line bg-cream px-4 pb-5 pt-3 md:hidden"
          >
            <ul className="flex flex-col">
              {[...NAV, ...(configured && !user ? [{ href: "/auth", label: "Sign in", group: "Overview" }] : [])].map((item, i, arr) => {
                const previous = arr[i - 1];
                const showsGroup = !previous || previous.group !== item.group;
                return (
                  <li key={item.href} className={showsGroup && i !== 0 ? "mt-2 border-t border-line pt-2 first:border-t-0" : ""}>
                    {showsGroup ? <p className="eyebrow pb-1.5 text-ink-soft">{item.group}</p> : null}
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={`flex items-center justify-between rounded-md px-2 py-2 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
                        pathname === item.href ? "bg-palm-wash/70 font-medium text-forest" : "text-ink hover:bg-brown-wash/60"
                      }`}
                    >
                      {item.label}
                      {pathname === item.href ? <span aria-hidden className="text-forest">•</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-10">
        {children}
      </main>

      <footer className="mt-6 border-t border-line bg-surface/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-6 text-sm text-ink-soft md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-display text-base font-medium text-forest">Cocorena</span>
            <span aria-hidden className="text-line">·</span>
            <span className="text-xs italic">study gently, grow steadily</span>
          </div>
          <p className="text-xs">
            {configured
              ? user
                ? "Account syncing enabled."
                : `${loading ? "Checking sign-in…" : "Guest mode — sign in from Settings to sync."}`
              : "Guest mode: your tasks, sessions, and streak live in this browser only."}
          </p>
        </div>
      </footer>
    </div>
  );
}
