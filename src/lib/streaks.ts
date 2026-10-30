/*
 * Streak calculation. Pure functions, no React, fully unit-tested.
 *
 * Rules (documented in-app too):
 * - A day "qualifies" when active focus time recorded that day >= the daily
 *   goal. With the default goal of 25 minutes the minimum is exactly 25.
 * - Time is attributed to the local day the session ENDED on.
 * - Today is "pending" until the goal is reached; it never counts as missed.
 * - Future days are never rendered as missed.
 * - Streaks are DERIVED from recorded sessions, never incremented blindly.
 */
import { addDaysKey, dayKey, diffDays, todayKey } from "@/lib/dates";
import type { FocusSession } from "@/lib/types";

export type DayStatus = "qualified" | "missed" | "pending" | "future";

export const MS_PER_MINUTE = 60_000;

/** Threshold in ms for a qualifying day. */
export function goalThresholdMs(dailyGoalMinutes: number): number {
  // Minimum 25 minutes (default goal). Configured goals use their full value.
  return Math.max(25, dailyGoalMinutes) * MS_PER_MINUTE;
}

/** Sum of countable active ms per local day from qualifying focus sessions only. */
export function dayTotalsFromSessions(
  sessions: FocusSession[],
  tz?: string | null,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    if (s.status === "abandoned") continue; // never awarded
    if (s.kind === "pomodoro_break") continue; // breaks are not focus time
    const key = dayKey(s.endedAt ?? s.startedAt, tz);
    totals.set(key, (totals.get(key) ?? 0) + s.activeMs);
  }
  return totals;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  productiveDays: number;
  todayStatus: "qualified" | "pending";
  todayActiveMs: number;
}

export function computeStreaks(
  dayTotals: Map<string, number>,
  dailyGoalMinutes: number,
  tz?: string | null,
): StreakStats {
  const threshold = goalThresholdMs(dailyGoalMinutes);
  const today = todayKey(tz);
  const qualifies = (key: string) => (dayTotals.get(key) ?? 0) >= threshold;
  const todayActiveMs = dayTotals.get(today) ?? 0;
  const todayQualified = todayActiveMs >= threshold;

  // Current streak: walk back from today (if qualified) or yesterday.
  let current = 0;
  if (qualifies(today)) {
    current = 1;
  }
  let cursor = addDaysKey(today, -1);
  while (qualifies(cursor)) {
    current += 1;
    cursor = addDaysKey(cursor, -1);
  }

  // Longest streak: scan every recorded day and contiguous runs; a run that
  // touches today may still not include today, so bound the scan at today.
  const keys = [...dayTotals.keys()].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of keys) {
    if (diffDays(key, today) < 0) continue; // future-proof guard
    if (qualifies(key)) {
      if (prev !== null && diffDays(prev, key) === 1) {
        run += 1;
      } else {
        run = 1;
      }
      prev = key;
      longest = Math.max(longest, run);
    } else {
      run = 0;
      prev = key;
    }
  }

  let productiveDays = 0;
  for (const [key, ms] of dayTotals) {
    if (diffDays(key, today) >= 0 && ms >= threshold) productiveDays += 1;
  }

  return {
    currentStreak: current,
    longestStreak: Math.max(longest, current),
    productiveDays,
    todayStatus: todayQualified ? "qualified" : "pending",
    todayActiveMs,
  };
}

export interface DayInfo {
  key: string;
  activeMs: number;
  status: DayStatus;
  goalFraction: number;
}

/** Status for each day of a list of day keys (used by the calendar/garden). */
export function dayInfos(
  keys: string[],
  dayTotals: Map<string, number>,
  dailyGoalMinutes: number,
  tz?: string | null,
): DayInfo[] {
  const threshold = goalThresholdMs(dailyGoalMinutes);
  const today = todayKey(tz);
  return keys.map((key) => {
    const activeMs = dayTotals.get(key) ?? 0;
    // diffDays(a, b) = b - a, so positive = key is in the PAST.
    const relativeDays = diffDays(key, today); // positive = past, 0 = today, negative = future
    let status: DayStatus;
    if (relativeDays > 0) {
      status = activeMs >= threshold ? "qualified" : "missed";
    } else if (relativeDays === 0) {
      status = activeMs >= threshold ? "qualified" : "pending";
    } else {
      status = "future";
    }
    return {
      key,
      activeMs,
      status,
      goalFraction: Math.min(1, activeMs / threshold),
    };
  });
}

export function streakMessage(stats: StreakStats): string {
  if (stats.todayStatus === "qualified") {
    return stats.currentStreak >= 2
      ? `${stats.currentStreak} days in a row — the grove is thickening.`
      : "First coconut of the day harvested. Keep it alive tomorrow.";
  }
  if (stats.currentStreak === 0) {
    return "Every grove starts with one good day. 25 minutes is all it takes.";
  }
  return `${stats.currentStreak}-day streak standing — protect it with a session today.`;
}
