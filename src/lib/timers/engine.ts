/*
 * Pure timer engine.
 *
 * Accuracy rules:
 * - Elapsed time is always computed from timestamps (Date.now() - startedAt),
 *   never by decrementing a counter in an interval. Background-tab throttling
 *   cannot corrupt it.
 * - `activeMs` accumulates only unpadded segments; paused time is excluded.
 * - A countdown/pomodoro is finished when activeMs >= targetMs.
 */
import type { TimerSnapshot } from "@/lib/types";
import { uid } from "@/lib/storage";

export const IDLE: TimerSnapshot = { status: "idle", activeMs: 0 };

export function startTimer(targetMs: number, now: number, mode?: "focus" | "break"): TimerSnapshot {
  return { status: "running", startedAt: now, activeMs: 0, targetMs, mode, segmentId: uid() };
}

export function startStopwatch(now: number): TimerSnapshot {
  return startTimer(0, now) as TimerSnapshot; // no target
}

export function elapsedActiveMs(t: TimerSnapshot, now: number): number {
  if (t.status === "running" && t.startedAt !== undefined) {
    return t.activeMs + Math.max(0, now - t.startedAt);
  }
  return t.activeMs;
}

export function remainingMs(t: TimerSnapshot, now: number): number {
  if (t.targetMs === undefined) return 0;
  return Math.max(0, t.targetMs - elapsedActiveMs(t, now));
}

export function isFinished(t: TimerSnapshot, now: number): boolean {
  if (t.targetMs === undefined) return false;
  return elapsedActiveMs(t, now) >= t.targetMs;
}

export function pauseTimer(t: TimerSnapshot, now: number): TimerSnapshot {
  if (t.status !== "running") return t;
  return { ...t, status: "paused", startedAt: undefined, activeMs: elapsedActiveMs(t, now) };
}

export function resumeTimer(t: TimerSnapshot, now: number): TimerSnapshot {
  if (t.status !== "paused") return t;
  return { ...t, status: "running", startedAt: now };
}

/** Reset to a new run of the same target without recording anything. */
export function restartTimer(t: TimerSnapshot, now: number, targetMs = t.targetMs ?? 0): TimerSnapshot {
  return { ...startTimer(targetMs, now, t.mode) };
}

/** Attempt to finalize a target-based timer that has reached zero.
 * Only finalizes from the `running` state — an already-finished timer is
 * never re-finalized, so completion events can't double-record. */
export function finalizeIfDone(t: TimerSnapshot, now: number): { snapshot: TimerSnapshot; finished: boolean } {
  if (t.status !== "running" || t.targetMs === undefined || !isFinished(t, now)) return { snapshot: t, finished: false };
  const activeMs = elapsedActiveMs(t, now);
  return {
    snapshot: { ...t, status: "finished", startedAt: undefined, activeMs, finishedMs: activeMs },
    finished: true,
  };
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatStopwatch(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

