import { describe, expect, it } from "vitest";
import { computeStreaks, dayInfos, dayTotalsFromSessions, goalThresholdMs, streakMessage } from "@/lib/streaks";
import { addDaysKey, todayKey } from "@/lib/dates";
import type { FocusSession } from "@/lib/types";

const TZ = "UTC";
const TODAY = todayKey(TZ);

function day(n: number): string {
  return addDaysKey(TODAY, -n);
}

function session(over: Partial<FocusSession>): FocusSession {
  return {
    id: "s1",
    kind: "pomodoro_focus",
    status: "completed",
    startedAt: Date.now() - 25 * 60_000,
    endedAt: Date.now(),
    activeMs: 25 * 60_000,
    ...over,
  } as FocusSession;
}

describe("day totals attribution", () => {
  it("attributes a session to the LOCAL day it ENDED on", () => {
    // Starts 22:50 UTC, ends 23:20 UTC same UTC day.
    const s = session({
      startedAt: Date.parse("2026-03-05T22:50:00Z"),
      endedAt: Date.parse("2026-03-05T23:20:00Z"),
    });
    const totals = dayTotalsFromSessions([s], "UTC");
    expect([...totals.keys()]).toEqual(["2026-03-05"]);
  });

  it("excludes abandoned sessions and breaks", () => {
    const sessions = [
      session({ id: "a", activeMs: 50 * 60_000 }),
      session({ id: "ab", status: "abandoned", activeMs: 90 * 60_000 }),
      session({ id: "br", kind: "pomodoro_break", activeMs: 30 * 60_000 }),
    ];
    const totals = dayTotalsFromSessions(sessions, "UTC");
    const totalMs = [...totals.values()].reduce((a, b) => a + b, 0);
    expect(totalMs).toBe(50 * 60_000);
  });
});

describe("streaks", () => {
  const goal = 25; // minutes

  it("a fresh user has no streak and a pending today", () => {
    const stats = computeStreaks(new Map(), goal, TODAY);
    expect(stats.currentStreak).toBe(0);
    expect(stats.todayStatus).toBe("pending");
    expect(stats.productiveDays).toBe(0);
  });

  it("today qualified counts as streak day 1", () => {
    const totals = dayTotalsFromSessions([session({})], "UTC");
    const stats = computeStreaks(totals, goal, TODAY);
    expect(stats.todayStatus).toBe("qualified");
    expect(stats.currentStreak).toBe(1);
    expect(stats.productiveDays).toBe(1);
  });

  it("yesterday + today makes a 2-day streak; today pending keeps yesterday's streak", () => {
    const yesterdaySession = session({
      endedAt: Date.parse(`${addDaysKey(TODAY, -1)}T12:00:00Z`),
      startedAt: Date.parse(`${addDaysKey(TODAY, -1)}T11:35:00Z`),
    });
    const totals = dayTotalsFromSessions([yesterdaySession], "UTC");
    expect(computeStreaks(totals, goal, TODAY).currentStreak).toBe(1); // pending today doesn't hurt

    const totals2 = dayTotalsFromSessions([yesterdaySession, session({})], "UTC");
    expect(computeStreaks(totals2, goal, TODAY).currentStreak).toBe(2);
  });

  it("a missed day between breaks the current streak", () => {
    const sessions = [
      session({ id: "h1", endedAt: Date.parse(`${day(2)}T12:00:00Z`), startedAt: Date.parse(`${day(2)}T11:35:00Z`) }),
      // day(1) missed â€” nothing recorded
      session({ endedAt: Date.parse(`${TODAY}T12:00:00Z`), startedAt: Date.parse(`${TODAY}T11:35:00Z`) }),
    ];
    const totals = dayTotalsFromSessions(sessions, "UTC");
    const stats = computeStreaks(totals, goal, TODAY);
    expect(stats.currentStreak).toBe(1); // only today counts
    expect(stats.longestStreak).toBe(1);
    expect(stats.productiveDays).toBe(2);
  });

  it("partial-but-under-goal days do not qualify (below threshold)", () => {
    const sessions = [
      session({ id: "s1", activeMs: 24 * 60_000, endedAt: Date.parse(`${TODAY}T10:00:00Z`), startedAt: Date.parse(`${TODAY}T09:35:00Z`) }),
    ];
    const totals = dayTotalsFromSessions(sessions, "UTC");
    const stats = computeStreaks(totals, goal, TODAY);
    expect(stats.todayStatus).toBe("pending"); // 24 < 25
    expect(stats.currentStreak).toBe(0);
  });

  it("multiple sessions in one day merge into ONE day (no multi-day awarding)", () => {
    const sessions = [
      session({ id: "m1", endedAt: Date.parse(`${TODAY}T09:20:00Z`), startedAt: Date.parse(`${TODAY}T08:55:00Z`) }),
      session({ id: "m2", endedAt: Date.parse(`${TODAY}T15:20:00Z`), startedAt: Date.parse(`${TODAY}T14:55:00Z`) }),
    ];
    const totals = dayTotalsFromSessions(sessions, "UTC");
    const stats = computeStreaks(totals, goal, TODAY);
    expect(stats.productiveDays).toBe(1);
    expect(stats.currentStreak).toBe(1);
  });

  it("longest streak scan works across a long history", () => {
    const sessions: FocusSession[] = [];
    for (let i = 5; i >= 0; i--) {
      sessions.push(
        session({ id: `s${i}`, endedAt: Date.parse(`${day(i)}T12:00:00Z`), startedAt: Date.parse(`${day(i)}T11:35:00Z`) }),
      );
    }
    const stats = computeStreaks(dayTotalsFromSessions(sessions, "UTC"), goal, TODAY);
    expect(stats.longestStreak).toBe(6);
    expect(stats.currentStreak).toBe(6);
  });

  it("threshold honors configured goals above 25 min", () => {
    expect(goalThresholdMs(25)).toBe(25 * 60_000);
    expect(goalThresholdMs(45)).toBe(45 * 60_000);
  });
});

describe("dayInfos for the calendar view", () => {
  it("never marks future days as missed; today is pending until qualified", () => {
    const totals = new Map<string, number>([[day(1), 30 * 60_000]]);
    const keys = [day(2), day(1), TODAY, addDaysKey(TODAY, 1)];
    const infos = dayInfos(keys, totals, 25, TODAY);
    expect(infos.map((i) => i.status)).toEqual(["missed", "qualified", "pending", "future"]);
  });
});

describe("encouraging copy", () => {
  it("gives a fresh user an inviting message, not shame", () => {
    const msg = streakMessage(computeStreaks(new Map(), 25, TODAY));
    expect(msg.toLowerCase()).not.toContain("missed");
    expect(msg).toContain("starts");
  });
});
