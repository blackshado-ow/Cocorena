import { describe, expect, it } from "vitest";
import {
  elapsedActiveMs,
  finalizeIfDone,
  formatCountdown,
  formatStopwatch,
  isFinished,
  pauseTimer,
  remainingMs,
  restartTimer,
  resumeTimer,
  startStopwatch,
  startTimer,
} from "@/lib/timers/engine";

const T0 = 1_700_000_000_000;

describe("timer engine", () => {
  it("counts active time from timestamps while running", () => {
    const t = startTimer(25 * 60_000, T0);
    expect(elapsedActiveMs(t, T0 + 5_000)).toBe(5_000);
    expect(elapsedActiveMs(t, T0 + 65_000)).toBe(65_000); // survives tab throttling
  });

  it("excludes paused time", () => {
    let t = startTimer(25 * 60_000, T0);
    t = pauseTimer(t, T0 + 10_000);
    expect(elapsedActiveMs(t, T0 + 30_000)).toBe(10_000); // no growth while paused
    t = resumeTimer(t, T0 + 30_000);
    expect(elapsedActiveMs(t, T0 + 35_000)).toBe(15_000);
  });

  it("supports multiple pause/resume cycles (stopwatch)", () => {
    let t = startStopwatch(T0);
    t = pauseTimer(t, T0 + 60_000); // 1 min studied
    t = resumeTimer(t, T0 + 120_000); // 60s break
    t = pauseTimer(t, T0 + 180_000); // another minute studied
    expect(elapsedActiveMs(t, T0 + 999_999)).toBe(120_000);
  });

  it("detects countdown completion and finalizes exactly once (idempotent)", () => {
    const target = 15 * 60_000;
    let t = startTimer(target, T0);
    t = pauseTimer(t, T0 + 60_000);
    t = resumeTimer(t, T0 + 300_000); // paused for 240s
    const doneAt = T0 + 300_000 + (target - 60_000);
    expect(isFinished(t, doneAt)).toBe(true);
    const fin = finalizeIfDone(t, doneAt);
    expect(fin.finished).toBe(true);
    expect(fin.snapshot.status).toBe("finished");
    // Calling finalize again is a no-op since the snapshot already finished.
    expect(finalizeIfDone(fin.snapshot, doneAt + 1_000).finished).toBe(false);
  });

  it("keeps remaining time in sync (countdown render model)", () => {
    const t = startTimer(10_000, T0);
    expect(remainingMs(t, T0 + 2_500)).toBe(7_500);
    expect(remainingMs(t, T0 + 11_000)).toBe(0);
  });

  it("restart produces a fresh segment id (no duplicate records)", () => {
    const a = startTimer(60_000, T0);
    const b = restartTimer({ ...a, status: "finished", activeMs: 60_000 }, T0 + 1_000, 60_000);
    expect(b.segmentId).not.toBe(a.segmentId);
    expect(b.activeMs).toBe(0);
  });

  it("formats hours, minutes and seconds", () => {
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(65_000)).toBe("1:05");
    expect(formatCountdown(3_600_000)).toBe("1:00:00");
    expect(formatStopwatch(7_385_000)).toBe("2:03:05");
  });
});
