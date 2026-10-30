"use client";

import { useEffect, useState } from "react";
import { Coffee, Pause, Play, RotateCcw, Square, SkipForward } from "lucide-react";
import { Badge, Button, Card, ClientOnly, Dialog, Field, Select } from "@/components/ui/primitives";
import { ProgressRing } from "@/components/timers/ProgressRing";
import { TodayFocusSummary } from "@/components/timers/TodayFocusSummary";
import { PalmTree } from "@/components/palm/PalmArt";
import { guestStore, useSettings, useTasks, useTimerSnapshots } from "@/lib/store";
import * as engine from "@/lib/timers/engine";
import { ensureNotificationPermission, notifyTimerDone, playChime } from "@/lib/feedback";
import { recordSession } from "@/lib/session-record";
import { useNow } from "@/hooks/use-tick";
import { formatHoursMinutes } from "@/lib/dates";
import { sortTasks } from "@/lib/tasks-utils";

export function PomodoroTimer() {
  const settings = useSettings();
  const timers = useTimerSnapshots();
  const tasks = useTasks();
  const snap = timers.pomodoro;
  const [endOpen, setEndOpen] = useState(false);
  const [taskId, setTaskId] = useState<string>("");
  const running = snap.status === "running";
  const now = useNow(running, 250);
  const focusMs = settings.focusMinutes * 60_000;
  const breakMs = settings.breakMinutes * 60_000;

  /* Completion detection — timestamp-based, works after throttling or refresh. */
  useEffect(() => {
    if (snap.status !== "running" || snap.targetMs === undefined) return;
    const nowMs = Date.now();
    if (!engine.isFinished(snap, nowMs)) return;
    const { snapshot, finished } = engine.finalizeIfDone(snap, nowMs);
    if (!finished) return;
    guestStore.setTimer("pomodoro", snapshot);
    recordSession({
      segmentId: snap.segmentId,
      kind: snap.mode === "break" ? "pomodoro_break" : "pomodoro_focus",
      status: "completed",
      startedAt: snap.startedAt ?? nowMs - (snapshot.finishedMs ?? 0),
      endedAt: nowMs,
      activeMs: snapshot.finishedMs ?? snap.targetMs,
      taskId: taskId || undefined,
    });
    if (settings.soundEnabled) playChime();
    if (settings.notificationsEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      notifyTimerDone(
        snap.mode === "break" ? "Break over" : "Focus session complete",
        snap.mode === "break" ? "Ready for the next session when you are." : "Time for a well-earned break.",
      );
    }
  }, [snap, now, taskId, settings.soundEnabled, settings.notificationsEnabled]);

  /* Live document title while running. */
  useEffect(() => {
    if (!running) return;
    const title = () =>
      `${engine.formatCountdown(Math.max(0, (snap.targetMs ?? 0) - engine.elapsedActiveMs(snap, Date.now())))} ${snap.mode === "break" ? "· break" : "· focus"} — Cocorena`;
    document.title = title();
    return () => {
      document.title = "Cocorena — your tropical study companion";
    };
  }, [running, snap, now]);

  const setSnap = (s: Parameters<typeof guestStore.setTimer>[1]) => guestStore.setTimer("pomodoro", s);

  function startFocus() {
    if (settings.notificationsEnabled) void ensureNotificationPermission();
    setSnap(engine.startTimer(focusMs, Date.now(), "focus"));
  }
  function pauseResume() {
    if (running) setSnap(engine.pauseTimer(snap, Date.now()));
    else setSnap(engine.resumeTimer(snap, Date.now()));
  }
  function endEarly() {
    const elapsed = engine.elapsedActiveMs(snap, Date.now());
    recordSession({
      segmentId: snap.segmentId,
      kind: snap.mode === "break" ? "pomodoro_break" : "pomodoro_focus",
      status: "abandoned",
      startedAt: snap.startedAt ?? Date.now() - elapsed,
      endedAt: Date.now(),
      activeMs: elapsed,
      taskId: taskId || undefined,
    });
    setEndOpen(false);
    setSnap(engine.IDLE);
  }
  function startBreak() {
    setSnap(engine.restartTimer({ ...snap, mode: "break" }, Date.now(), breakMs));
  }
  function backToFocus() {
    setSnap(engine.IDLE);
  }

  const remaining = Math.max(0, (snap.targetMs ?? focusMs) - engine.elapsedActiveMs(snap, now));
  const fraction = snap.targetMs ? Math.min(1, engine.elapsedActiveMs(snap, now) / snap.targetMs) : 0;
  const isBreak = snap.mode === "break";
  const activeTasks = sortTasks(tasks.filter((t) => !t.completed));

  const phase =
    snap.status === "finished"
      ? isBreak
        ? "break-done"
        : "focus-done"
      : snap.status === "idle"
        ? "idle"
        : "running";

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Badge tone={isBreak ? "terracotta" : "palm"}>
            {phase === "break-done" ? "Break finished" : phase === "focus-done" ? "Focus session complete" : isBreak ? "Break" : "Focus"}
          </Badge>
          {running || snap.status === "paused" ? (
            <Badge tone="neutral" className="tnum">
              {running ? "Running" : "Paused"} · {formatHoursMinutes(engine.elapsedActiveMs(snap, running ? now : Date.now()))} active
            </Badge>
          ) : null}
        </div>

        <ClientOnly fallback={<div className="mx-auto my-6 h-56 w-56 animate-pulse rounded-full bg-brown-wash" />}>
          <div className="flex flex-col items-center gap-5">
            <ProgressRing fraction={fraction} color={isBreak ? "var(--color-terracotta)" : "var(--color-palm)"} size={260}>
              <span className="tnum text-5xl font-semibold text-forest md:text-6xl">
                {phase === "idle"
                  ? engine.formatCountdown(focusMs)
                  : phase === "focus-done" || phase === "break-done"
                    ? engine.formatCountdown(snap.finishedMs ?? 0)
                    : engine.formatCountdown(remaining)}
              </span>
              <span className="mt-1 text-sm text-ink-soft">
                {phase === "idle"
                  ? `one ${settings.focusMinutes}-minute focus session`
                  : phase === "running"
                    ? isBreak
                      ? "rest well — not counted as focus"
                      : "stay with one task"
                    : phase === "focus-done"
                      ? "break available"
                      : "ready for another"}
              </span>
            </ProgressRing>

            {phase !== "idle" && phase !== "focus-done" && phase !== "break-done" ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {snap.status === "running" ? (
                  <Button variant="secondary" size="lg" onClick={pauseResume}>
                    <Pause size={18} aria-hidden /> Pause
                  </Button>
                ) : snap.status === "paused" ? (
                  <Button size="lg" onClick={pauseResume}>
                    <Play size={18} aria-hidden /> Resume
                  </Button>
                ) : null}
                {isBreak ? (
                  <Button variant="ghost" onClick={backToFocus}>
                    <SkipForward size={16} aria-hidden /> Skip break
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => setEndOpen(true)}>
                    <Square size={16} aria-hidden /> End session
                  </Button>
                )}
              </div>
            ) : null}

            {phase === "idle" ? (
              <Button size="lg" onClick={startFocus}>
                <Play size={18} aria-hidden /> Start focus session
              </Button>
            ) : null}

            {phase === "focus-done" ? (
              <div className="flex flex-col items-center gap-2">
                <Button size="lg" onClick={startBreak}>
                  <Coffee size={18} aria-hidden /> Start {settings.breakMinutes}-minute break
                </Button>
                <Button variant="ghost" onClick={backToFocus}>
                  Skip break
                </Button>
              </div>
            ) : null}

            {phase === "break-done" ? (
              <Button size="lg" onClick={backToFocus}>
                <RotateCcw size={18} aria-hidden /> Fresh focus session
              </Button>
            ) : null}
          </div>
        </ClientOnly>
      </Card>

      <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <Field label="Link this session to a task (optional)">
            <Select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              aria-label="Session task"
              className="max-w-sm"
            >
              <option value="">No linked task</option>
              {activeTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </Field>
          <p className="mt-2 text-xs text-ink-soft">
            Pauses are excluded from recorded time. Ending early records the session as abandoned — it adds no focus time,
            but nothing is lost: your statistics stay accurate.
          </p>
        </div>
        <div className="hidden shrink-0 sm:block" aria-hidden>
          <PalmTree coconuts={0} growing={running && !isBreak} className="h-28" />
        </div>
      </Card>

      <TodayFocusSummary tz={settings.timezone} />

      <Dialog open={endOpen} onClose={() => setEndOpen(false)} title="End this session early?">
        <p className="text-sm text-ink-soft">
          The session will be recorded as <strong>abandoned</strong>. It will not add focus time or grow the streak, so your
          statistics don&apos;t get inflated.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEndOpen(false)}>
            Keep going
          </Button>
          <Button variant="danger" onClick={endEarly}>
            <Square size={15} aria-hidden /> End session
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
