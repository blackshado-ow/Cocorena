"use client";

import { Flame } from "lucide-react";
import { useSessions, useSettings } from "@/lib/store";
import { dayKey } from "@/lib/dates";
import { useMounted } from "@/hooks/use-mounted";

/** "Today: 50m focus · 2 sessions" — derived from real recorded sessions. */
export function TodayFocusSummary({ tz }: { tz?: string | null }) {
  const sessions = useSessions();
  const settings = useSettings();
  const mounted = useMounted();
  /* The clock is a device value: it is read only after hydration, so the
   * prerendered shell shows the honest "0 min" state until then. */
  const key = mounted ? dayKey(Date.now(), tz) : "";
  const today = sessions.filter(
    (s) => s.status === "completed" && s.kind !== "pomodoro_break" && dayKey(s.endedAt ?? s.startedAt, tz) === key,
  );
  const ms = today.reduce((acc, s) => acc + s.activeMs, 0);
  const minutes = Math.floor(ms / 60_000);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
      <span className="inline-flex items-center gap-1.5">
        <Flame size={14} className="text-terracotta" aria-hidden />
        <span>
          Today: <strong className="text-forest">{minutes} min</strong> focus of{" "}
          {settings.dailyGoalMinutes} min goal
        </span>
      </span>
      <span>
        Sessions today: <strong className="text-forest">{today.length}</strong>
      </span>
    </div>
  );
}
