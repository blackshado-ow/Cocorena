"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Save, RotateCcw, Square } from "lucide-react";
import { Button, Card, ClientOnly, Dialog, Field, Select } from "@/components/ui/primitives";
import { TodayFocusSummary } from "@/components/timers/TodayFocusSummary";
import { PalmTree, Sprig } from "@/components/palm/PalmArt";
import { guestStore, useSettings, useTasks, useTimerSnapshots } from "@/lib/store";
import * as engine from "@/lib/timers/engine";
import { recordSession } from "@/lib/session-record";
import { useNow } from "@/hooks/use-tick";
import { sortTasks } from "@/lib/tasks-utils";

export function StopwatchTimer() {
  const timers = useTimerSnapshots();
  const tasks = useTasks();
  const settings = useSettings();
  const snap = timers.stopwatch;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const active = snap.status !== "idle";
  const running = snap.status === "running";
  const now = useNow(active, 250);
  /* elapsedActiveMs only needs the live clock while running — for paused,
   * finished, or idle snapshots it returns the stored activeMs as-is. Passing
   * a clock read only in the running branch keeps prerendering device-free. */
  const elapsed = engine.elapsedActiveMs(snap, running ? now : 0);

  /* Live document title while timing (timestamp-based display). */
  useEffect(() => {
    if (!active) return;
    document.title = `${engine.formatStopwatch(engine.elapsedActiveMs(snap, Date.now()))} · stopwatch — Cocorena`;
    return () => {
      document.title = "Cocorena — your tropical study companion";
    };
  }, [active, snap, now]);

  const setSnap = (s: Parameters<typeof guestStore.setTimer>[1]) => guestStore.setTimer("stopwatch", s);

  function control() {
    if (snap.status === "idle") {
      setSnap(engine.startStopwatch(Date.now()));
      return;
    }
    if (running) setSnap(engine.pauseTimer(snap, Date.now()));
    else setSnap(engine.resumeTimer(snap, Date.now()));
  }

  /** Save the accumulated active time; at least a minute, else explain. */
  function finishAndSave() {
    const ms = engine.elapsedActiveMs(snap, Date.now());
    if (ms < 60_000) {
      setSavedMsg("Shorter than a minute — nothing was recorded, nothing was inflated.");
      setSnap(engine.IDLE);
      return;
    }
    recordSession({
      segmentId: snap.segmentId,
      kind: "stopwatch_focus",
      status: "completed",
      startedAt: Date.now() - ms,
      endedAt: Date.now(),
      activeMs: ms,
      taskId: taskId || undefined,
    });
    setSavedMsg(`Session saved · ${Math.round(ms / 60_000)} min focus time.`);
    setSnap(engine.IDLE);
  }

  function discard() {
    setConfirmOpen(false);
    setSnap(engine.IDLE);
  }

  /* Space toggles start/pause — guarded so typing anywhere never fires it. */
  const spaceAction = useRef<() => void>(() => {});
  useEffect(() => {
    spaceAction.current = () => {
      if (snap.status === "idle" || running || snap.status === "paused") control();
    };
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.tagName === "BUTTON" || t.isContentEditable)) return;
      e.preventDefault();
      spaceAction.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeTasks = sortTasks(tasks.filter((t) => !t.completed));

  return (
    <div className="flex flex-col gap-6">
      <Card className="relative overflow-hidden p-6 md:p-9">
        <Sprig className="pointer-events-none absolute -right-2 -top-2 h-28 w-28 rotate-12 opacity-40" />
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow text-brown">{running ? "Counting · open study" : snap.status === "paused" ? "Paused" : "Stopwatch"}</p>
          {snap.status === "paused" ? <span className="text-xs text-ink-soft">Paused time is not counted.</span> : null}
        </div>

        <ClientOnly fallback={<div className="mx-auto my-6 h-20 w-full max-w-md animate-pulse rounded-lg bg-brown-wash" />}>
          <p className="tnum font-display mx-auto max-w-md text-center text-6xl font-medium text-forest md:text-7xl" aria-live="off">
            {engine.formatStopwatch(elapsed)}
          </p>
          <p className="mt-3 text-center text-sm text-ink-soft">
            {savedMsg ?? "Active study time, accurate across tab throttling — hours supported."}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {snap.status === "idle" ? (
              <Button size="lg" onClick={control}>
                <Play size={18} aria-hidden /> Start stopwatch
              </Button>
            ) : null}
            {snap.status !== "idle" ? (
              <>
                {running ? (
                  <Button variant="secondary" size="lg" onClick={control}>
                    <Pause size={18} aria-hidden /> Pause (take a break)
                  </Button>
                ) : (
                  <Button size="lg" onClick={control}>
                    <Play size={18} aria-hidden /> Resume
                  </Button>
                )}
                <Button size="lg" onClick={finishAndSave}>
                  <Save size={18} aria-hidden /> Finish &amp; save session
                </Button>
                <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
                  <RotateCcw size={16} aria-hidden /> Reset
                </Button>
              </>
            ) : null}
          </div>

          <p className="mt-4 text-center text-xs text-ink-soft/80">
            Space starts or pauses · only “Finish &amp; save” records time
          </p>
        </ClientOnly>
      </Card>

      <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <Field label="Link this study block to a task (optional)">
            <Select value={taskId} onChange={(e) => setTaskId(e.target.value)} aria-label="Session task" className="max-w-sm">
              <option value="">No linked task</option>
              {activeTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </Field>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Elapsed time comes from timestamps, so background-tab throttling and refreshes can&apos;t lose time. Only
            &quot;Finish &amp; save&quot; records a session; Reset throws the block away (with confirmation).
          </p>
        </div>
        <div className="hidden shrink-0 sm:block" aria-hidden>
          <PalmTree coconuts={0} growing={running} className="h-28" />
        </div>
      </Card>

      <Card className="px-5 pb-4 pt-3">
        <TodayFocusSummary tz={settings.timezone} />
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Reset the stopwatch?">
        <p className="text-sm text-ink-soft">
          Elapsed time will be discarded without creating a session record.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Keep timing
          </Button>
          <Button variant="danger" onClick={discard}>
            <Square size={15} aria-hidden /> Discard &amp; reset
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
