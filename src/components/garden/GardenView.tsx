"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Card, CardHeader, ClientOnly, ProgressBar } from "@/components/ui/primitives";
import { CoconutDot, PalmTree } from "@/components/palm/PalmArt";
import { useSessions, useSettings, useTimerSnapshots } from "@/lib/store";
import { computeStreaks, dayInfos, dayTotalsFromSessions, goalThresholdMs, streakMessage } from "@/lib/streaks";
import { formatKeyLong, monthMatrix, todayKey } from "@/lib/dates";
import { useMounted } from "@/hooks/use-mounted";

export function GardenView() {
  const sessions = useSessions();
  const settings = useSettings();
  const timers = useTimerSnapshots();
  const [monthOffset, setMonthOffset] = useState(0);

  /* “Today” is a device value, resolved only after hydration. The prerendered
   * shell can't rely on it, so the calendar mounts with a neutral placeholder. */
  const mounted = useMounted();
  const tz = settings.timezone;
  const today = mounted ? todayKey(tz) : "";
  const resolvedToday = today || "1970-01-01";
  /* Correct month arithmetic regardless of month length. */
  const base = new Date(`${resolvedToday}T00:00:00Z`);
  const displayed = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset, 1));
  const year = displayed.getUTCFullYear();
  const month0 = displayed.getUTCMonth();
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(displayed);
  const isCurrentMonth = mounted && monthOffset === 0;

  const dayTotals = useMemo(() => dayTotalsFromSessions(sessions, tz), [sessions, tz]);
  const stats = useMemo(() => computeStreaks(dayTotals, settings.dailyGoalMinutes, today), [dayTotals, settings.dailyGoalMinutes, today]);
  const infos = useMemo(() => dayInfos(monthMatrix(year, month0).map((c) => c.key), dayTotals, settings.dailyGoalMinutes, today), [dayTotals, settings.dailyGoalMinutes, today, year, month0]);
  const cells = monthMatrix(year, month0);

  const threshold = goalThresholdMs(settings.dailyGoalMinutes);
  const todayFraction = Math.min(1, stats.todayActiveMs / threshold);
  const growing =
    (timers.pomodoro.status === "running" && timers.pomodoro.mode === "focus") ||
    timers.stopwatch.status === "running";

  const dayHeaders = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div className="flex flex-col gap-8">
      <Card className="relative overflow-hidden">
        <div className="flex flex-col items-center gap-4 p-6 md:flex-row md:items-center md:justify-between md:gap-8 md:px-8 md:py-7">
          <div className="text-center md:text-left">
            <h2 className="font-display text-2xl font-medium text-forest md:text-3xl">Your coconut grove</h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">
              {sessions.length === 0
                ? "No sessions recorded yet. Finish a focus session today and your first coconut appears."
                : streakMessage(stats)}
            </p>
          </div>
          <PalmTree coconuts={stats.currentStreak} growing={growing} className="h-48 shrink-0" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
        <GardenStat label="Current streak" value={`${stats.currentStreak}`} suffix={stats.currentStreak === 1 ? "day" : "days"} />
        <GardenStat label="Longest streak" value={`${stats.longestStreak}`} suffix={stats.longestStreak === 1 ? "day" : "days"} />
        <GardenStat label="Productive days" value={`${stats.productiveDays}`} suffix="total" />
        <div className="border-t border-line pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-soft">Today&apos;s goal</p>
          <p className="font-display mt-1.5 text-3xl font-medium text-forest">
            {Math.min(settings.dailyGoalMinutes, Math.round(stats.todayActiveMs / 60_000))}
            <span className="text-sm font-normal text-ink-soft"> / {settings.dailyGoalMinutes} min</span>
          </p>
          <div className="mt-2.5">
            <ProgressBar fraction={todayFraction} label="Today's focus goal progress" showPercent={false} />
          </div>
        </div>
      </div>

      {mounted ? (
        <Card>
          <CardHeader
            title="Daily history"
            subtitle="Green = goal reached · red outline cross = missed · dashed = still open"
            action={
              <div className="flex items-center gap-1">
                <Button onClick={() => setMonthOffset((m) => m - 1)} ariaLabel="Previous month">
                  <ChevronLeft size={16} aria-hidden />
                </Button>
                <span className="min-w-32 text-center text-sm font-medium text-forest">{monthLabel}</span>
                <Button disabled={isCurrentMonth} onClick={() => setMonthOffset((m) => m + 1)} ariaLabel="Next month">
                  <ChevronRight size={16} aria-hidden />
                </Button>
              </div>
            }
          />
          <div className="p-5">
            <div className="grid grid-cols-7 gap-1.5">
              {dayHeaders.map((d) => (
                <div key={d} className="pb-1 text-center text-xs font-medium text-ink-soft">
                  {d}
                </div>
              ))}
              {cells.map((cell, i) => {
                const info = infos[i];
                if (!info) return null;
                const isToday = cell.key === today;
                return (
                  <div
                    key={cell.key}
                    title={`${formatKeyLong(cell.key)} — ${
                      info.status === "qualified"
                        ? `${Math.round(info.activeMs / 60_000)} min focused`
                        : info.status === "pending"
                          ? "in progress today"
                          : info.status === "missed"
                            ? "goal missed"
                            : "no data yet"
                    }`}
                    className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors ${
                      isToday ? "bg-brown-wash ring-1 ring-brown" : cell.inMonth ? "hover:bg-cream" : "opacity-40"
                    }`}
                  >
                    <CoconutDot status={info.status} size={22} />
                    <span className={`text-[10px] ${isToday ? "font-semibold text-brown-deep" : "text-ink-soft"}`}>
                      {parseInt(cell.key.slice(-2), 10)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <CoconutDot status="qualified" size={14} /> qualified day
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CoconutDot status="missed" size={14} /> missed day
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CoconutDot status="pending" size={14} /> today (pending)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CoconutDot status="future" size={14} /> future
              </span>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Daily history" subtitle="Green = goal reached · red outline cross = missed · dashed = still open" />
          <div className="p-5">
            <div className="h-56 animate-pulse rounded-lg bg-brown-wash" aria-label="Loading your month" />
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-palm" aria-hidden />
          <div className="text-sm text-ink-soft">
            <p className="font-medium text-forest">How the grove works</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                A day qualifies when you record <strong className="text-forest">at least {Math.max(25, settings.dailyGoalMinutes)} focused minutes</strong> (this is your daily goal).
              </li>
              <li>Focus time counts from Pomodoro sessions, saved stopwatch blocks, and focus blocks you explicitly log from the Countdown timer. Breaks and abandoned sessions never count.</li>
              <li>Time is grouped by <strong className="text-forest">your local calendar day</strong>
                {tz ? ` (timezone override: ${tz})` : " (device timezone)"}
                {" "}and attributed to the day a session finished.
              </li>
              <li>Your day stays &quot;pending&quot; until midnight — it can&apos;t hurt you. Future days are never shown as missed.</li>
              <li>Streaks are always recalculated from your recorded sessions — a missed day doesn&apos;t erase work: yesterday&apos;s minutes stay yours.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function GardenStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="border-t border-line pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-soft">{label}</p>
      <p className="font-display mt-1.5 flex items-baseline gap-1 text-3xl font-medium text-forest">
        <ClientOnly fallback={<span>–</span>}>{value}</ClientOnly>
        {suffix ? <span className="text-xs font-medium text-ink-soft">{suffix}</span> : null}
      </p>
    </div>
  );
}

/* small aria-labelled icon button used by month nav */
function Button({ onClick, disabled, children, ariaLabel }: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="rounded-md border border-line bg-surface p-1.5 text-forest hover:bg-brown-wash disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
    >
      {children}
    </button>
  );
}
