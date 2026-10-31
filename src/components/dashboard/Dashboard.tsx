"use client";

import Link from "next/link";
import { ListChecks, Sprout, Users } from "lucide-react";
import { Badge, Button, Card, CardHeader, ClientOnly, EmptyState, ProgressBar, Select, TextInput } from "@/components/ui/primitives";
import { CoconutDot, PalmTree, Sprig } from "@/components/palm/PalmArt";
import { useLocalGroup, useSessions, useSettings, useTasks, useTimerSnapshots } from "@/lib/store";
import { computeStreaks, dayInfos, dayTotalsFromSessions, goalThresholdMs, MS_PER_MINUTE } from "@/lib/streaks";
import { addDaysKey, formatKeyLong, todayKey, dayKey } from "@/lib/dates";
import { topPriorityTasks, isOverdue, validateTaskInput } from "@/lib/tasks-utils";
import { TIPS } from "@/lib/content/tips";
import { guestStore } from "@/lib/store";
import { mirrorUpsertTask } from "@/lib/supabase/sync";
import { useCloudUser } from "@/lib/supabase/auth-state";
import { useMounted } from "@/hooks/use-mounted";
import { uid } from "@/lib/storage";
import { useState } from "react";
import type { Priority, Task } from "@/lib/types";

const MOTIVATIONS = [
  "Small ticks, tall trees: every session you finish is one planted.",
  "Discipline is remembering what you want — one Pomodoro is a gentle reminder.",
  "You don't need more time; you need one focused session to start.",
  "Consistency is louder than intensity. Show up for 25 minutes.",
];

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function Dashboard() {
  const settings = useSettings();
  const sessions = useSessions();
  const tasks = useTasks();
  const timers = useTimerSnapshots();
  const localGroup = useLocalGroup();
  const { configured, user } = useCloudUser();
  /* “Today” is a device value, so it is resolved only after hydration — the
   * prerendered shell renders the neutral states and the live values swap in
   * on mount without layout-boundary streaming. */
  const mounted = useMounted();
  const tz = settings.timezone;
  const today = mounted ? todayKey(tz) : "";

  /* Quick task creation */
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("medium");
  const [quickError, setQuickError] = useState<string | null>(null);

  function addQuickTask(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateTaskInput({ title: quickTitle });
    if (!validation.ok) {
      setQuickError(validation.error ?? "Something isn't right.");
      return;
    }
    const task: Task = {
      id: uid(),
      title: quickTitle.trim(),
      priority: quickPriority,
      completed: false,
      createdAt: Date.now(),
    };
    guestStore.addTask(task);
    mirrorUpsertTask(task);
    setQuickTitle("");
    setQuickPriority("medium");
    setQuickError(null);
  }

  const dayTotals = dayTotalsFromSessions(sessions, tz);
  const stats = computeStreaks(dayTotals, settings.dailyGoalMinutes, today);
  const threshold = goalThresholdMs(settings.dailyGoalMinutes);
  const todayMs = dayTotals.get(today) ?? 0;
  const todaySessions =
    sessions
      .filter((s) => s.status === "completed" && s.kind !== "pomodoro_break" && new Date(s.endedAt ?? s.startedAt).getTime() !== 0)
      .filter((s) => {
        /* count today's completed focus sessions */
        return dayKey(s.endedAt ?? s.startedAt, tz) === today;
      }).length;
  const remainingTasks = tasks.filter((t) => !t.completed).length;
  const doneTasks = tasks.length - remainingTasks;
  const priority = topPriorityTasks(tasks);

  const hour = mounted ? new Date().getHours() : 12;
  const greeting = hour < 5 ? "Studying late?" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const motivation = MOTIVATIONS[dayNumberHash(today) % MOTIVATIONS.length];
  const tip = TIPS[dayNumberHash(today) % TIPS.length];

  const last7 = Array.from({ length: 7 }, (_, i) => addDaysKey(today || "1970-01-01", i - 6));
  const week = dayInfos(last7, dayTotals, settings.dailyGoalMinutes, today);
  const growing =
    (timers.pomodoro.status === "running" && timers.pomodoro.mode === "focus") ||
    timers.stopwatch.status === "running";
  const timerActive = timers.pomodoro.status === "running" || timers.stopwatch.status === "running";

  return (
    <div className="flex flex-col gap-8">
      {/* Masthead band — open-air typography, not a card */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-brown">{mounted ? formatKeyLong(today).toUpperCase() : "WELCOME BACK"}</p>
          <h1 className="font-display mt-1.5 text-4xl font-medium text-forest md:text-5xl">
            {greeting}
            {user ? `, ${safeName(user)}` : ""}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{motivation}</p>
        </div>
        <Sprig className="hidden h-20 w-20 shrink-0 self-end text-palm opacity-70 lg:block" />
      </div>

      {/* Focus entry — the one dark panel on the page */}
      <section className="relative overflow-hidden rounded-lg bg-forest px-6 py-7 text-cream shadow-pop md:px-9 md:py-8">
        <Sprig className="pointer-events-none absolute -right-3 -top-3 h-36 w-36 rotate-[18deg] text-palm opacity-30" flip />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="max-w-lg">
            <p className="eyebrow text-cream/60">Today&apos;s focus</p>
            <h2 className="font-display mt-1.5 text-2xl font-medium text-cream md:text-3xl">
              One session is all it takes to plant today.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-cream/70">
              {timerActive
                ? "A timer is running — Cocorena keeps counting across tabs and refreshes."
                : mounted
                  ? "Pomodoro, stopwatch, or countdown — every method records honest minutes."
                  : "Pick a method that fits the next half hour."}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/focus"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cream px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
              >
                Start a focus session
              </Link>
              <Link
                href="/stopwatch"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-cream/30 px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-cream/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
              >
                Open stopwatch
              </Link>
            </div>
            <ClientOnly fallback={<span className="text-xs text-cream/50">today: – min</span>}>
              <p className="tnum text-xs text-cream/70">
                today: <strong className="font-semibold text-cream">{Math.round(todayMs / MS_PER_MINUTE)} min</strong> of{" "}
                {settings.dailyGoalMinutes} min goal · {todaySessions} session{todaySessions === 1 ? "" : "s"}
              </p>
            </ClientOnly>
          </div>
        </div>
      </section>

      {/* Indicator band — rules above numbers, no boxes */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
        <Indicator
          label="Focus today"
          fallback="– min"
          value={`${Math.round(todayMs / MS_PER_MINUTE)} min`}
          more={
            <>
              <ProgressBar fraction={threshold > 0 ? Math.min(1, todayMs / threshold) : 0} label="Daily focus goal progress" showPercent={false} />
              <span className="text-[11px] text-ink-soft">goal {settings.dailyGoalMinutes} min</span>
            </>
          }
        />
        <Indicator
          label="Sessions today"
          fallback="–"
          value={`${todaySessions}`}
          more={<span className="text-[11px] text-ink-soft">completed focus sessions</span>}
        />
        <Indicator
          label="Current streak"
          fallback="–"
          value={`${stats.currentStreak}`}
          more={<span className="text-[11px] text-ink-soft">longest {stats.longestStreak} days · growing{growing ? "" : " quiet"}</span>}
        />
        <Indicator
          label="Tasks"
          fallback="–"
          value={`${doneTasks}/${tasks.length}`}
          more={<span className="text-[11px] text-ink-soft">{remainingTasks} still open</span>}
        />
      </div>

      {/* Working canvas: 12-column grid */}
      <div className="grid gap-5 md:grid-cols-12">
        {/* Priority tasks + quick create */}
        <Card className="md:col-span-8">
          <CardHeader
            title="Priority tasks"
            subtitle="High first, due soonest — knock them off between sessions"
            action={<Link href="/tasks" className="text-sm font-medium text-palm-deep hover:underline">All tasks →</Link>}
          />
          <ClientOnly fallback={<div className="p-5" />}>
            <div className="p-5">
              <form onSubmit={addQuickTask} aria-label="Quick add a task" className="flex flex-col gap-2 sm:flex-row">
                <TextInput
                  value={quickTitle}
                  onChange={(e) => {
                    setQuickTitle(e.target.value);
                    if (quickError) setQuickError(null);
                  }}
                  maxLength={120}
                  aria-label="New task"
                  placeholder="Add a task — e.g. Revise integration formulas"
                  aria-describedby={quickError ? "quick-add-error" : undefined}
                />
                <Select
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value as Priority)}
                  aria-label="Priority"
                  className="sm:w-32"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
                <Button type="submit" className="sm:w-auto">
                  Add
                </Button>
              </form>
              {quickError ? (
                <p id="quick-add-error" role="alert" className="mt-2 text-xs font-medium text-miss">
                  {quickError}
                </p>
              ) : null}

              <div className="mt-4 border-t border-line pt-4">
                {priority.length === 0 ? (
                  <EmptyState icon={<ListChecks size={24} />} title="No open tasks" hint="Add your first task above to plan the day." />
                ) : (
                  <ul className="flex flex-col">
                    {priority.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 border-b border-line/70 px-1 py-2.5 last:border-b-0">
                        <button
                          role="checkbox"
                          aria-checked={false}
                          aria-label={`Complete ${t.title}`}
                          onClick={() => {
                            const updated = { ...t, completed: true, completedAt: Date.now() };
                            guestStore.updateTask(t.id, updated);
                            mirrorUpsertTask(updated);
                          }}
                          className="h-5 w-5 shrink-0 rounded-full border-2 border-line bg-cream hover:border-palm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-forest">{t.title}</span>
                        <Badge tone={t.priority === "high" ? "terracotta" : t.priority === "medium" ? "brown" : "neutral"}>
                          {t.priority}
                        </Badge>
                        {isOverdue(t, today) ? <Badge tone="miss">overdue</Badge> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </ClientOnly>
        </Card>

        {/* Last 7 days */}
        <Card className="md:col-span-4">
          <CardHeader title="This week" subtitle="One coconut per day" action={<Link href="/garden" className="text-sm font-medium text-palm-deep hover:underline">Grove →</Link>} />
          <ClientOnly fallback={<div className="p-5" />}>
            <div className="grid grid-cols-7 gap-1 p-5">
              {week.map((d) => (
                <div key={d.key} className="flex flex-col items-center gap-1.5">
                  <span className="eyebrow text-[9px] text-ink-soft">{WEEKDAY_INITIALS[new Date(`${d.key}T00:00:00Z`).getUTCDay()]}</span>
                  <CoconutDot status={d.status} size={26} />
                  <span className="tnum text-[10px] text-ink-soft">{d.key.slice(-2)}</span>
                </div>
              ))}
            </div>
          </ClientOnly>
        </Card>

        {/* Garden preview */}
        <Card className="md:col-span-4">
          <CardHeader title="Your grove" subtitle="A tree grows one day at a time" action={<Link href="/garden" className="text-sm font-medium text-palm-deep hover:underline">Visit →</Link>} />
          <div className="flex items-center gap-4 p-5">
            <ClientOnly fallback={<div className="h-24 w-20 shrink-0 rounded bg-brown-wash/60" />}>
              <PalmTree coconuts={stats.currentStreak} growing={growing} className="h-24 w-20 shrink-0" />
            </ClientOnly>
            <div className="flex flex-col gap-1">
              <p className="font-display text-3xl font-medium text-forest">
                <ClientOnly fallback={<span>–</span>}>{stats.currentStreak}</ClientOnly>
                <span className="ml-1 text-sm font-normal text-ink-soft">day streak</span>
              </p>
              <p className="text-xs leading-relaxed text-ink-soft">
                {growing ? "A coconut is ripening right now." : "Finish a focus session to grow today's coconut."}
              </p>
              <p className="text-xs text-ink-soft">
                Productive days so far: <strong className="text-forest"><ClientOnly fallback={<span>–</span>}>{stats.productiveDays}</ClientOnly></strong>
              </p>
            </div>
          </div>
        </Card>

        {/* Groups summary */}
        <Card className="md:col-span-4">
          <CardHeader
            title="Study group"
            subtitle={configured && user ? "Synced with your account" : "Guest mode — local only"}
            action={<Link href="/groups" className="text-sm font-medium text-palm-deep hover:underline">{localGroup ? "Open →" : "Create →"}</Link>}
          />
          <div className="p-5">
            {localGroup ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-forest">{localGroup.name}</p>
                <p className="text-xs text-ink-soft">
                  Join code <span className="tnum font-mono font-semibold text-forest">{localGroup.joinCode}</span> · up to 12 members
                </p>
                <Badge tone="neutral">
                  <Users size={11} aria-hidden /> 1 member (this device)
                </Badge>
              </div>
            ) : (
              <EmptyState icon={<Users size={24} />} title="No group yet" hint="Create a study group and share its code with friends." />
            )}
          </div>
        </Card>

        {/* Tip of the day — pull quote */}
        <Card className="md:col-span-4">
          <div className="flex flex-col gap-3 p-6">
            <p className="eyebrow text-brown">Today&apos;s advice · {tip.category}</p>
            <blockquote className="border-l-2 border-palm pl-4">
              <p className="font-display text-lg leading-snug text-forest">{tip.title}</p>
              <footer className="mt-1.5 text-sm leading-relaxed text-ink-soft">{tip.summary}</footer>
            </blockquote>
            <Link href="/focus-corner" className="flex items-center gap-1.5 text-sm font-medium text-palm-deep hover:underline">
              <Sprout size={14} aria-hidden /> Read full advice in Focus Corner
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Indicator({ label, value, fallback, more }: {
  label: string;
  value: string;
  fallback: string;
  more?: React.ReactNode;
}) {
  return (
    <div className="border-t border-line pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-soft">{label}</p>
      <p className="font-display mt-1.5 text-3xl font-medium text-forest">
        <ClientOnly fallback={<span>{fallback}</span>}>{value}</ClientOnly>
      </p>
      {more ? <div className="mt-1.5 flex flex-col gap-1">{more}</div> : null}
    </div>
  );
}

function dayNumberHash(key: string): number {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function safeName(user: { user_metadata?: Record<string, unknown>; email?: string }): string {
  const name = (user.user_metadata?.full_name ?? user.email ?? "") as string;
  return String(name).split("@")[0] || "friend";
}
