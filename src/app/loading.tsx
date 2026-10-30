export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20" role="status" aria-label="Loading page">
      <div className="flex items-center gap-3 text-ink-soft">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-palm [animation-delay:-120ms]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-palm" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-palm [animation-delay:120ms]" />
        <span className="ml-2 text-sm">Warming the coconut milk…</span>
      </div>
    </div>
  );
}
