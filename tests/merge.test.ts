import { describe, expect, it } from "vitest";
import { planSessionImport, planTaskImport } from "@/lib/merge";
import type { FocusSession } from "@/lib/types";

const localTasks = [
  { id: "t1", title: "Alpha", priority: "high" as const, completed: false, createdAt: 1 },
  { id: "t2", title: "Beta", priority: "low" as const, completed: true, createdAt: 2 },
];
const localSessions: FocusSession[] = [
  { id: "s1", kind: "pomodoro_focus", status: "completed", startedAt: 1, endedAt: 2, activeMs: 60_000 },
  { id: "s2", kind: "stopwatch_focus", status: "completed", startedAt: 3, endedAt: 4, activeMs: 120_000 },
];

describe("guest ✈ account import (no duplicates)", () => {
  it("uploads only ids not already in the account", () => {
    const plan = planTaskImport(localTasks, [{ id: "t1" }]);
    expect(plan.skipped).toBe(1);
    expect(plan.toUpload.map((t) => t.id)).toEqual(["t2"]);
  });

  it("uploads everything when the account is fresh", () => {
    expect(planTaskImport(localTasks, [])).toMatchObject({ skipped: 0 });
    expect(planTaskImport(localTasks, []).toUpload).toHaveLength(2);
    expect(planSessionImport(localSessions, []).toUpload).toHaveLength(2);
  });

  it("skips everything when the account already has all data", () => {
    expect(planSessionImport(localSessions, localSessions)).toMatchObject({
      skipped: 2,
      toUpload: [],
    });
  });
});
