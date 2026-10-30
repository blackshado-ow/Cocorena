"use client";

import { useEffect, useState } from "react";

/** True only after client mount — the gate that prevents SSR/localStorage hydration mismatches. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
