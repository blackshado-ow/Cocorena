"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isCloudConfigured } from "@/lib/supabase/config";

let client: SupabaseClient | null = null;

/** Lazily build the browser client. Returns null when the app runs unconfigured. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isCloudConfigured()) return null;
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
