"use client";

/*
 * Guest-mode data layer.
 *
 * Source of truth in guest mode: localStorage, hydrated into this module and
 * broadcast via a tiny pub/sub so React slices stay consistent. When Supabase
 * is configured and the user signs in, writes are mirrored to the cloud by
 * lib/supabase/sync.ts (which also imports this data into the account once).
 */
import { useSyncExternalStore } from "react";
import type {
  AppSettings,
  FocusSession,
  StudyGroup,
  Task,
  TimerKind,
  TimerSnapshot,
} from "@/lib/types";
import { readJSON, uid, writeJSON, removeItem } from "@/lib/storage";
import { IDLE } from "@/lib/timers/engine";

export const DEFAULT_SETTINGS: AppSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  dailyGoalMinutes: 25,
  soundEnabled: true,
  notificationsEnabled: true,
  timezone: null,
};

const emptyArray: never[] = [];

class GuestStore {
  private listeners = new Set<() => void>();
  private hydrated = false;

  settings: AppSettings = DEFAULT_SETTINGS;
  tasks: Task[] = [];
  sessions: FocusSession[] = [];
  favorites: string[] = [];
  timers: Record<TimerKind, TimerSnapshot> = { pomodoro: IDLE, stopwatch: IDLE, countdown: IDLE };
  localGroup: StudyGroup | null = null;

  ensureHydrated(): void {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    this.settings = readJSON("settings", DEFAULT_SETTINGS, isRecord);
    this.tasks = readJSON("tasks", emptyArray, Array.isArray) as Task[];
    this.sessions = readJSON("sessions", emptyArray, Array.isArray) as FocusSession[];
    this.favorites = readJSON("favorites", emptyArray, Array.isArray) as string[];
    const storedTimers = readJSON("timers", null, isRecord) as Record<TimerKind, TimerSnapshot> | null;
    this.timers = { pomodoro: IDLE, stopwatch: IDLE, countdown: IDLE, ...(storedTimers ?? {}) };
    this.localGroup = readJSON<StudyGroup | null>("group", null, isRecordOrNull);
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSettings = (): AppSettings => {
    this.ensureHydrated();
    return this.settings;
  };

  updateSettings(patch: Partial<AppSettings>): void {
    this.ensureHydrated();
    this.settings = { ...this.settings, ...patch };
    writeJSON("settings", this.settings);
    this.emit();
  }

  getTasks = (): Task[] => {
    this.ensureHydrated();
    return this.tasks;
  };

  addTask(input: Omit<Task, "id" | "createdAt" | "completed">): Task {
    this.ensureHydrated();
    const task: Task = { ...input, id: uid(), completed: false, createdAt: Date.now() };
    this.tasks = [...this.tasks, task];
    writeJSON("tasks", this.tasks);
    this.emit();
    return task;
  }

  updateTask(id: string, patch: Partial<Task>): void {
    this.ensureHydrated();
    let found = false;
    this.tasks = this.tasks.map((t) => {
      if (t.id !== id) return t;
      found = true;
      return { ...t, ...patch };
    });
    if (found) {
      writeJSON("tasks", this.tasks);
      this.emit();
    }
  }

  deleteTask(id: string): void {
    this.ensureHydrated();
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    if (this.tasks.length !== before) {
      writeJSON("tasks", this.tasks);
      this.emit();
    }
  }

  getSessions = (): FocusSession[] => {
    this.ensureHydrated();
    return this.sessions;
  };

  /** Idempotent: one row per session id, no duplicates possible. */
  upsertSession(session: FocusSession): void {
    this.ensureHydrated();
    const index = this.sessions.findIndex((s) => s.id === session.id);
    if (index >= 0 && shallowEqualSession(this.sessions[index], session)) return;
    if (index >= 0) {
      this.sessions = this.sessions.map((s, i) => (i === index ? session : s));
    } else {
      this.sessions = [...this.sessions, session];
      // Bound growth: keep the trailing 2,000 sessions.
      if (this.sessions.length > 2000) this.sessions = this.sessions.slice(-2000);
    }
    writeJSON("sessions", this.sessions);
    this.emit();
  }

  getTimers = (): Record<TimerKind, TimerSnapshot> => {
    this.ensureHydrated();
    return this.timers;
  };

  setTimer(kind: TimerKind, snapshot: TimerSnapshot): void {
    this.ensureHydrated();
    this.timers = { ...this.timers, [kind]: snapshot };
    writeJSON("timers", this.timers);
    this.emit();
  }

  getFavorites = (): string[] => {
    this.ensureHydrated();
    return this.favorites;
  };

  toggleFavorite(tipId: string): void {
    this.ensureHydrated();
    this.favorites = this.favorites.includes(tipId)
      ? this.favorites.filter((id) => id !== tipId)
      : [...this.favorites, tipId];
    writeJSON("favorites", this.favorites);
    this.emit();
  }

  getLocalGroup = (): StudyGroup | null => {
    this.ensureHydrated();
    return this.localGroup;
  };

  setLocalGroup(group: StudyGroup | null): void {
    this.ensureHydrated();
    this.localGroup = group;
    if (group) writeJSON("group", group);
    else removeItem("group");
    this.emit();
  }

  clearAllData(): void {
    this.settings = DEFAULT_SETTINGS;
    this.tasks = [];
    this.sessions = [];
    this.favorites = [];
    this.timers = { pomodoro: IDLE, stopwatch: IDLE, countdown: IDLE };
    this.localGroup = null;
    for (const name of ["settings", "tasks", "sessions", "favorites", "timers", "group"]) {
      removeItem(name);
    }
    this.emit();
  }
}

function isRecord(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function isRecordOrNull(value: unknown): boolean {
  return value === null || isRecord(value);
}

function shallowEqualSession(a: FocusSession, b: FocusSession): boolean {
  return (
    a.id === b.id &&
    a.kind === b.kind &&
    a.status === b.status &&
    a.startedAt === b.startedAt &&
    a.endedAt === b.endedAt &&
    a.activeMs === b.activeMs &&
    a.taskId === b.taskId
  );
}

export const guestStore = new GuestStore();

/* ---------------- React hooks over the store ---------------- */

function useSlice<T>(get: () => T): T {
  return useSyncExternalStore(guestStore.subscribe, get, get);
}

export function useSettings(): AppSettings {
  return useSlice(guestStore.getSettings);
}

export function useTasks(): Task[] {
  return useSlice(guestStore.getTasks);
}

export function useSessions(): FocusSession[] {
  return useSlice(guestStore.getSessions);
}

export function useTimerSnapshots(): Record<TimerKind, TimerSnapshot> {
  return useSlice(guestStore.getTimers);
}

export function useFavorites(): string[] {
  return useSlice(guestStore.getFavorites);
}

export function useLocalGroup(): StudyGroup | null {
  return useSlice(guestStore.getLocalGroup);
}
