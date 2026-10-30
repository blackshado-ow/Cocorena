/* Static fallback streamed while the interactive shell hydrates (Next 16
 * Cache Components requires this boundary because AppShell reads usePathname). */
export function AppShellFallback() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="h-100 border-b border-black/10 bg-forest">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-semibold text-cream/90">Cocorena</span>
          <div className="h-7 w-40 animate-pulse rounded-lg bg-cream/10" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8" />
      <footer className="h-100 border-t border-line bg-surface/70" />
    </div>
  );
}
