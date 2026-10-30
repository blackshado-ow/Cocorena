/*
 * Session recording — the ONE place sessions turn into statistics.
 * Idempotent by construction: every timer run owns a stable segmentId used as
 * the session id, so a double-completion event updates rather than duplicates.
 */
import type { FocusSession, SessionKind, SessionKindAll, SessionStatus } from "@/lib/types";
import { guestStore } from "@/lib/store";
import { mirrorUpsertSession } from "@/lib/supabase/sync";
import { uid } from "@/lib/storage";

export function recordSession(input: {
  segmentId?: string;
  kind: SessionKindAll;
  status: SessionStatus;
  startedAt: number;
  endedAt: number;
  activeMs: number;
  taskId?: string;
}): FocusSession {
  const activeMs = Math.max(0, Math.round(input.activeMs));
  if (activeMs < 1000) {
    // Ignore phantom completions shorter than a second — they distort nothing.
    return { id: input.segmentId ?? uid(), startedAt: input.startedAt, endedAt: input.endedAt, activeMs: 0, kind: input.kind, status: input.status, taskId: input.taskId };
  }
  const session: FocusSession = {
    id: input.segmentId ?? uid(),
    kind: input.kind,
    status: input.status,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    activeMs,
    taskId: input.taskId,
  };
  guestStore.upsertSession(session);
  mirrorUpsertSession(session);
  return session;
}

/** Countable session kinds contribute to the daily goal. */
export function isCountable(kind: SessionKindAll): kind is SessionKind {
  return kind !== "pomodoro_break";
}
