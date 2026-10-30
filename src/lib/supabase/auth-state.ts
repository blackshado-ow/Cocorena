"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isCloudConfigured } from "@/lib/supabase/config";

export interface CloudAuthState {
  configured: boolean;
  loading: boolean;
  user: User | null;
}

/** Reflects the Supabase auth session in the browser. Falls back gracefully
 * when the cloud is not configured (configured=false, user=null). */
export function useCloudUser(): CloudAuthState {
  const [state, setState] = useState<CloudAuthState>({
    configured: isCloudConfigured(),
    loading: isCloudConfigured(),
    user: null,
  });

  useEffect(() => {
    if (!isCloudConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;
    setState((s) => ({ ...s, loading: true }));
    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        if (active) setState({ configured: true, loading: false, user: data.user ?? null });
      })
      .catch(() => {
        if (active) setState({ configured: true, loading: false, user: null });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;
      setState({ configured: true, loading: false, user: session?.user ?? null });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
