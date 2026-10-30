import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { guestStore } from "@/lib/store";
import { clearAllCocorenaData, storageKey, uid } from "@/lib/storage";

/* Minimal localStorage stub (node test environment). */
const backing = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => void backing.set(k, v),
  removeItem: (k: string) => onceRemove(k),
  key: (i: number) => [...backing.keys()][i] ?? null,
  get length() {
    return backing.size;
  },
  clear: () => backing.clear(),
};
let removed = false;
function onceRemove(k: string) {
  backing.delete(k);
  removed = true;
}

beforeEach(() => {
  backing.clear();
  removed = false;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: localStorageStub, setTimeout, clearTimeout },
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
});

describe("store", () => {
  it("upsertSession is idempotent — a double completion event creates ONE record", () => {
    guestStore.ensureHydrated();
    guestStore.clearAllData();
    const base = {
      id: "sess-1",
      kind: "pomodoro_focus" as const,
      status: "completed" as const,
      startedAt: 1_000,
      endedAt: 26 * 60_000 + 1_000,
      activeMs: 25 * 60_000,
    };
    guestStore.upsertSession(base);
    // Duplicate event with identical payload → still one row.
    guestStore.upsertSession({ ...base });
    guestStore.upsertSession({ ...base, status: "abandoned" }); // correction replaces
    expect(guestStore.getSessions().filter((s) => s.id === "sess-1")).toHaveLength(1);
    expect(guestStore.getSessions()[0]?.status).toBe("abandoned");
    expect(backing.get(storageKey("sessions"))).toBeTruthy();
  });

  it("tasks CRUD persists across rehydrate", () => {
    guestStore.ensureHydrated();
    guestStore.clearAllData();
    const t = guestStore.addTask({ title: "Revise", priority: "high" });
    guestStore.updateTask(t.id, { completed: true, completedAt: 5 });
    expect(guestStore.getTasks().find((x) => x.id === t.id)?.completed).toBe(true);
    guestStore.deleteTask(t.id);
    expect(guestStore.getTasks()).toHaveLength(0);

    // Rehydration (fresh module run would re-read storage; here simulate by
    // checking the persisted JSON is valid).
    expect(JSON.parse(backing.get(storageKey("tasks")) ?? "[]")).toEqual([]);
  });

  it("settings round-trip", () => {
    guestStore.ensureHydrated();
    guestStore.clearAllData();
    guestStore.updateSettings({ dailyGoalMinutes: 45, soundEnabled: false });
    const fromStorage = JSON.parse(backing.get(storageKey("settings")) ?? "{}");
    expect(fromStorage.dailyGoalMinutes).toBe(45);
    expect(fromStorage.soundEnabled).toBe(false);
  });

  it("uid() is uuid-shaped for cloud compatibility", () => {
    const id = uid();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(uid()).not.toBe(id);
  });

  it("clearAllCocorenaData removes only Cocorena keys", () => {
    backing.set(storageKey("tasks"), "[]");
    backing.set("unrelated-key", "keep me");
    clearAllCocorenaData();
    expect(backing.get(storageKey("tasks"))).toBeUndefined();
    expect(backing.get("unrelated-key")).toBe("keep me");
    expect(removed).toBe(true);
  });
});
