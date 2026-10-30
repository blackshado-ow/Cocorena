/* Shared application types. Kept framework-free so logic stays testable. */

export type TimerKind = "pomodoro" | "stopwatch" | "countdown";

export type Priority = "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: Priority;
  /** Local calendar date, formatted YYYY-MM-DD. */
  dueDate?: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

/** countable kind: time goes toward the daily goal. */
export type SessionKind = "pomodoro_focus" | "stopwatch_focus" | "manual_focus";
/** not counted toward focus stats. */
export type SessionBreakKind = "pomodoro_break";
export type SessionKindAll = SessionKind | SessionBreakKind;
export type SessionStatus = "completed" | "abandoned";

export interface FocusSession {
  id: string;
  kind: SessionKindAll;
  status: SessionStatus;
  startedAt: number;
  endedAt: number;
  /** Milliseconds of active (unpaused) time. */
  activeMs: number;
  taskId?: string;
}

export interface AppSettings {
  focusMinutes: number;
  breakMinutes: number;
  dailyGoalMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  /** IANA timezone override; null/undefined means device-local days. */
  timezone: string | null;
}

/** Persisted state of one timer (pomodoro, stopwatch, countdown). */
export interface TimerSnapshot {
  status: "idle" | "running" | "paused" | "finished";
  /** Epoch ms when the current running segment started. */
  startedAt?: number;
  /** Accumulated ACTIVE milliseconds from finished segments. */
  activeMs: number;
  /** Full duration in ms (pomodoro/countdown); stopwatch has none. */
  targetMs?: number;
  /** Pomodoro mode when a run is in progress. */
  mode?: "focus" | "break";
  /** Stable id of the segment currently or most recently run (idempotent recording). */
  segmentId?: string;
  /** How long a finished countdown/pomodoro was, for display. */
  finishedMs?: number;
}

export interface StudyGroup {
  id: string;
  name: string;
  joinCode: string;
  createdAt: number;
  ownerId: string;
  memberIds: string[];
}

export interface GroupPresenceMember {
  id: string;
  name: string;
  status: "idle" | "focusing" | "on-break";
  focusMinutesToday: number;
}

export interface Tip {
  id: string;
  category: TipCategory;
  title: string;
  summary: string;
  body: string[];
  readMinutes: number;
}

export type TipCategory =
  | "Focus & concentration"
  | "Study techniques"
  | "Breaks & rest"
  | "Time management"
  | "Distraction control"
  | "Exam preparation"
  | "Habit building";
