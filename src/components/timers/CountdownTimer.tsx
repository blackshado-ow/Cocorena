"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, Save } from "lucide-react";
import { Badge, Button, Card, ClientOnly, Dialog, Field, TextInput } from "@/components/ui/primitives";
import { ProgressRing } from "@/components/timers/ProgressRing";
import { TodayFocusSummary } from "@/components/timers/TodayFocusSummary";
import { guestStore, useSettings, useTimerSnapshots } from "@/lib/store";
import * as engine from "@/lib/timers/engine";
import { ensureNotificationPermission, notifyTimerDone, playChime } from "@/lib/feedback";
import { recordSession } from "@/lib/session-record";
import { useNow } from "@/hooks/use-tick";

const PRESETS = [5, 10, 25, 45];

export function CountdownTimer() {
  const timers = useTimerSnapshots();
  const settings = useSettings();
  const snap = timers.countdown;
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("25");
  const [seconds, setSeconds] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggedMsg, setLoggedMsg] = useState<string | null>(null);

  const running = snap.status === "running";
  const active = snap.status !== "idle";
  const now = useNow(active, 250);

  /* Completion detection (also catches finishes that happened while throttled). */
  useEffect(() => {
    if (snap.status !== "running" || snap.targetMs === undefined) return;
    const nowMs = Date.now();
    if (!engine.isFinished(snap, nowMs)) return;
    const { snapshot, finished } = engine.finalizeIfDone(snap, nowMs);
    if (!finished) return;
    guestStore.setTimer("countdown", snapshot);
    if (settings.soundEnabled) playChime();
    if (settings.notificationsEnabled) notifyTimerDone("Countdown finished", "Time is up — take note of where you stopped.");
  }, [snap, now, settings.soundEnabled, settings.notificationsEnabled]);

  /* Live document title. */
  useEffect(() => {
    if (!active) return;
    document.title = `${engine.formatCountdown(Math.max(0, (snap.targetMs ?? 0) - engine.elapsedActiveMs(snap, running ? now : Date.now())))} · countdown — Cocorena`;
    return () => {
      document.title = "Cocorena — your tropical study companion";
    };
  }, [active, snap, now, running]);

  function startCountdown() {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const s = parseInt(seconds, 10) || 0;
    const total = h * 3_600_000 + m * 60_000 + s * 1_000;
    if (total < 1_000) {
      setError("Choose at least one second.");
      return;
    }
    if (total > 24 * 3_600_000) {
      setError("Keep the countdown to 24 hours or less.");
      return;
    }
    setError(null);
    setLoggedMsg(null);
    if (settings.notificationsEnabled) void ensureNotificationPermission();
    guestStore.setTimer("countdown", engine.startTimer(total, Date.now()));
  }

  function pauseResume() {
    if (running) guestStore.setTimer("countdown", engine.pauseTimer(snap, Date.now()));
    else guestStore.setTimer("countdown", engine.resumeTimer(snap, Date.now()));
  }

  function reset() {
    setConfirmOpen(false);
    guestStore.setTimer("countdown", engine.IDLE);
    setLoggedMsg(null);
  }

  function logAsFocus() {
    const ms = snap.finishedMs ?? snap.activeMs;
    if (ms > 0) {
      recordSession({
        segmentId: snap.segmentId,
        kind: "manual_focus",
        status: "completed",
        startedAt: Date.now() - ms,
        endedAt: Date.now(),
        activeMs: ms,
      });
      setLoggedMsg(`Added ${Math.round(ms / 60_000)} min to today's focus total.`);
    }
    guestStore.setTimer("countdown", engine.IDLE);
  }

  const remaining = Math.max(0, (snap.targetMs ?? 0) - engine.elapsedActiveMs(snap, running ? now : Date.now()));
  const fraction = snap.targetMs ? engine.elapsedActiveMs(snap, running ? now : Date.now()) / snap.targetMs : 0;
  const finished = snap.status === "finished";

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Badge tone={finished ? "brown" : running ? "palm" : snap.status === "paused" ? "brown" : "neutral"}>
            {finished ? "Time is up" : running ? "Counting down" : snap.status === "paused" ? "Paused" : "Not started"}
          </Badge>
        </div>

        <ClientOnly fallback={<div className="mx-auto my-6 h-56 w-56 animate-pulse rounded-full bg-brown-wash" />}>
          {active || finished ? (
            <div className="flex flex-col items-center gap-5">
              <ProgressRing fraction={fraction} color="var(--color-brown)" size={260}>
                <span className="tnum text-5xl font-semibold text-forest md:text-6xl">
                  {engine.formatCountdown(finished ? 0 : remaining)}
                </span>
                <span className="mt-1 text-sm text-ink-soft">
                  {finished ? "countdown complete" : running ? "keep going" : "paused"}
                </span>
              </ProgressRing>

              {finished ? (
                <p aria-live="polite" className="text-center text-sm font-medium text-terracotta">
                  Time is up! {loggedMsg ?? "Decide whether this block counts as focus time."}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-center gap-2">
                {finished ? (
                  <>
                    <Button size="lg" onClick={logAsFocus}>
                      <Save size={18} aria-hidden /> Log as focus time
                    </Button>
                    <Button variant="secondary" size="lg" onClick={reset}>
                      <RotateCcw size={18} aria-hidden /> New countdown
                    </Button>
                  </>
                ) : (
                  <>
                    {running ? (
                      <Button variant="secondary" size="lg" onClick={pauseResume}>
                        <Pause size={18} aria-hidden /> Pause
                      </Button>
                    ) : (
                      <Button size="lg" onClick={pauseResume}>
                        <Play size={18} aria-hidden /> Resume
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
                      <RotateCcw size={16} aria-hidden /> Reset
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                startCountdown();
              }}
            >
              <div className="grid grid-cols-3 gap-3">
                <Field label="Hours" htmlFor="cd-hours">
                  <TextInput
                    id="cd-hours"
                    type="number"
                    min={0}
                    max={23}
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    invalid={!!error}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Minutes" htmlFor="cd-minutes">
                  <TextInput
                    id="cd-minutes"
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    invalid={!!error}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Seconds" htmlFor="cd-seconds">
                  <TextInput
                    id="cd-seconds"
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                    invalid={!!error}
                    inputMode="numeric"
                  />
                </Field>
              </div>
              {error ? (
                <p role="alert" className="text-sm font-medium text-miss">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-soft">Quick picks:</span>
                {PRESETS.map((p) => (
                  <Button
                    key={p}
                    variant="subtle"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setHours("0");
                      setMinutes(String(p));
                      setSeconds("0");
                      setError(null);
                    }}
                  >
                    {p} min
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-center">
                <Button size="lg" type="submit">
                  <Play size={18} aria-hidden /> Start countdown
                </Button>
              </div>
              <p className="text-center text-xs text-ink-soft">
                Countdowns don&apos;t count as focus time by default — use &quot;Log as focus time&quot; when a block deserves it.
              </p>
            </form>
          )}
        </ClientOnly>
      </Card>

      <TodayFocusSummary tz={settings.timezone} />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Reset the countdown?">
        <p className="text-sm text-ink-soft">Remaining time will be discarded. No focus time was recorded by countdowns unless you explicitly log it.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Keep counting
          </Button>
          <Button variant="danger" onClick={reset}>
            <RotateCcw size={15} aria-hidden /> Reset
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
