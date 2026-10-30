"use client";

import { useEffect, useState } from "react";

/** Forces a periodic re-render while `active` so timestamp-based displays stay live. */
export function useTick(active: boolean, periodMs = 250): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), periodMs);
    return () => window.clearInterval(id);
  }, [active, periodMs]);
  return tick;
}

/** Living "now" while active; stable mount-time value otherwise. */
export function useNow(active: boolean, periodMs = 250): number {
  const [now, setNow] = useState(() =>
    typeof window === "undefined" ? 0 : Date.now(),
  );
  const tick = useTick(active, periodMs);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
  }, [active, tick]);
  return now;
}
