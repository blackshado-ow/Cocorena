"use client";

/*
 * One-time, idempotent import of guest-mode data into the signed-in account.
 * Called right after a successful sign-in/sign-up. Never deletes local data;
 * the same local data simply gains a cloud home (and stays as offline cache).
 *
 * This module is only exercised when Supabase credentials are configured.
 * It could not be verified end-to-end without a real project's credentials —
 * see README "Supabase setup".
 */
import type { User } from "@supabase/supabase-js";
import { guestStore } from "@/lib/store";
import type { FocusSession, Task } from "@/lib/types";
import { planSessionImport, planTaskImport } from "@/lib/merge";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface ImportResult {
  ok: boolean;
  tasksUploaded: number;
  sessionsUploaded: number;
  error?: string;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function importGuestDataToCloud(user: User): Promise<ImportResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, tasksUploaded: 0, sessionsUploaded: 0, error: "not-configured" };

  try {
    const { data: remoteTasks, error: tErr } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", user.id)
      .limit(1000);
    if (tErr) return { ok: false, tasksUploaded: 0, sessionsUploaded: 0, error: tErr.message };

    const { data: remoteSessions, error: sErr } = await supabase
      .from("focus_sessions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1000);
    if (sErr) return { ok: false, tasksUploaded: 0, sessionsUploaded: 0, error: sErr.message };
    const taskPlan = planTaskImport(
      guestStore.getTasks(),
      ((remoteTasks ?? []) as { id: string }[]).map((t) => ({ id: t.id })),
    );
    const sessionPlan = planSessionImport(
      guestStore.getSessions(),
      ((remoteSessions ?? []) as { id: string }[]).map((s) => ({ id: s.id })),
    );

    for (const batch of chunk(taskPlan.toUpload, 100)) {
      const { error } = await supabase
        .from("tasks")
        .insert(batch.map((t) => ({ user_id: user.id, ...t })));
      if (error) throw new Error(error.message);
    }

    for (const batch of chunk(sessionPlan.toUpload, 100)) {
      const { error } = await supabase
        .from("focus_sessions")
        .insert(batch.map((s) => ({ user_id: user.id, ...s })));
      if (error) throw new Error(error.message);
    }

    const settings = guestStore.getSettings();
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      display_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      timezone: settings.timezone,
      settings: settings as unknown as Record<string, unknown>,
    });

    return {
      ok: true,
      tasksUploaded: taskPlan.toUpload.length,
      sessionsUploaded: sessionPlan.toUpload.length,
    };
  } catch (err) {
    return {
      ok: false,
      tasksUploaded: 0,
      sessionsUploaded: 0,
      error: err instanceof Error ? err.message : "import-failed",
    };
  }
}

/** Best-effort mirror of a new/updated item to the cloud. Fails silently. */
function withCloudUserId(fn: (userId: string) => Promise<unknown>): void {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  void supabase.auth
    .getUser()
    .then(({ data }) => {
      if (data.user) return fn(data.user.id);
    })
    .catch(() => undefined);
}

export function mirrorUpsertTask(task: Task): void {
  withCloudUserId((userId) =>
    supabaseUpsert("tasks", { ...task, user_id: userId }),
  );
}

export function mirrorDeleteTask(id: string): void {
  withCloudUserId((userId) =>
    supabaseUpsert("tasks", null, { id, user_id: userId }),
  );
}

export function mirrorUpsertSession(session: FocusSession): void {
  withCloudUserId((userId) =>
    supabaseUpsert("focus_sessions", { ...session, user_id: userId }),
  );
}

async function supabaseUpsert(table: string, row?: Record<string, unknown> | null, del?: Record<string, unknown>): Promise<unknown> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  if (row) return supabase.from(table).upsert(row);
  const { id, user_id } = del ?? {};
  if (typeof id !== "string" || typeof user_id !== "string") return;
  return supabase.from(table).delete().eq("id", id).eq("user_id", user_id);
}
