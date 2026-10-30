"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  ListChecks,
  Menu,
  Sprout,
  Target,
  Timer,
  Users,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/palm/PalmArt";
import { Badge } from "@/components/ui/primitives";
import { useCloudUser } from "@/lib/supabase/auth-state";

const NAV = [
  { href: "/", label: "Dashboard", icon: null },
  { href: "/focus", label: "Focus", icon: Target },
  { href: "/stopwatch", label: "Stopwatch", icon: Timer },
  { href: "/countdown", label: "Countdown", icon: Timer },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/garden", label: "Garden", icon: Sprout },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/focus-corner", label: "Focus Corner", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: null },
] as const;

function NavLink({ href, label, icon: Icon, active, onNavigate }: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }> | null;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream ${
        active ? "bg-cream/15 text-cream" : "text-cream/75 hover:bg-cream/10 hover:text-cream"
      }`}
    >
      {Icon ? <Icon size={15} aria-hidden /> : null}
      {label}
    </Link>
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-forest"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-black/10 bg-forest text-cream shadow-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream" aria-label="Cocorena home">
            <LogoMark size={28} />
            <span className="text-lg font-semibold tracking-tight">Cocorena</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
            {NAV.slice(0, 8).map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname === item.href} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {configured ? (
              user ? (
                <Link
                  href="/settings"
                  className="hidden rounded-xl border border-cream/25 px-3 py-1.5 text-sm font-medium text-cream hover:bg-cream/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream md:inline-flex"
                >
                  Account
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="hidden rounded-xl bg-cream px-3 py-1.5 text-sm font-semibold text-forest hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream md:inline-flex"
                >
                  Sign in
                </Link>
              )
            ) : (
              <span className="hidden md:inline-flex" title="Guest mode — data lives in this browser">
                <Badge tone="brown" className="border border-cream/25 bg-cream/10 text-cream/85">
                  Guest mode
                </Badge>
              </span>
            )}
            <button
              className="rounded-lg p-2 text-cream hover:bg-cream/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav id="mobile-nav" aria-label="Mobile" className="animate-fade border-t border-cream/15 bg-forest px-4 py-3 md:hidden">
            <ul className="grid grid-cols-2 gap-1">
              {[...NAV, ...(configured && !user ? [{ href: "/auth", label: "Sign in", icon: null }] : [])].map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={pathname === item.href}
                    onNavigate={() => setMenuOpen(false)}
                  />
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-8">
        {children}
      </main>

      <footer className="mt-4 border-t border-line bg-surface/70">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-5 text-sm text-ink-soft">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="font-medium text-forest">Cocorena</span>
            <span aria-hidden>·</span>
            <span>study gently, grow steadily</span>
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
