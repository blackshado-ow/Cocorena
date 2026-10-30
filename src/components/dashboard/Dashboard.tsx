"use client";

import Link from "next/link";
import { Check, Flame, ListChecks, Sprout, Target, Users } from "lucide-react";
import { Badge, Button, Card, CardHeader, ClientOnly, EmptyState, ProgressBar, Spinner } from "@/components/ui/primitives";
import { CoconutDot, PalmTree } from "@/components/palm/PalmArt";
import { useLocalGroup, useSessions, useSettings, useTasks, useTimerSnapshots } from "@/lib/store";
import { computeStreaks, dayInfos, dayTotalsFromSessions, goalThresholdMs, MS_PER_MINUTE } from "@/lib/streaks";
import { addDaysKey, formatKeyLong, todayKey, dayKey } from "@/lib/dates";
import { topPriorityTasks, isOverdue } from "@/lib/tasks-utils";
import { TIPS } from "@/lib/content/tips";
import { guestStore } from "@/lib/store";
import { mirrorUpsertTask } from "@/lib/supabase/sync";
import { useCloudUser } from "@/lib/supabase/auth-state";

const MOTIVATIONS = [
  "Small ticks, tall trees: every session you finish is one planted.",
  "Discipline is remembering what you want — one Pomodoro is a gentle reminder.",
  "You don't need more time; you need one focused session to start.",
  "Consistency is louder than intensity. Show up for 25 minutes.",
];

export function Dashboard() {
  const settings = useSettings();
  const sessions = useSessions();
  const tasks = useTasks();
  const timers = useTimerSnapshots();
  const localGroup = useLocalGroup();
  const { configured, user } = useCloudUser();
  const tz = settings.timezone;
  const today = todayKey(tz);

  const dayTotals = dayTotalsFromSessions(sessions, tz);
  const stats = computeStreaks(dayTotals, settings.dailyGoalMinutes, tz);
  const threshold = goalThresholdMs(settings.dailyGoalMinutes);
  const todayMs = dayTotals.get(today) ?? 0;
  const todaySessions = sessions.filter(
    (s) => s.status === "completed" && s.kind !== "pomodoro_break" && new Date(s.endedAt ?? s.startedAt).getTime() !== 0,
  ).filter((s) => {
    /* count today's completed focus sessions */
    const key = dayKey(s.endedAt ?? s.startedAt, tz);
    return key === today;
  }).length;
  const remainingTasks = tasks.filter((t) => !t.completed).length;
  const doneTasks = tasks.length - remainingTasks;
  const priority = topPriorityTasks(tasks);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Studying late?" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const motivation = MOTIVATIONS[dayNumberHash(today) % MOTIVATIONS.length];
  const tip = TIPS[dayNumberHash(today) % TIPS.length];

  const last7 = Array.from({ length: 7 }, (_, i) => addDaysKey(today, i - 6));
  const week = dayInfos(last7, dayTotals, settings.dailyGoalMinutes, tz);
  const growing =
    (timers.pomodoro.status === "running" && timers.pomodoro.mode === "focus") ||
    timers.stopwatch.status === "running";

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <Card className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <p className="text-sm text-ink-soft">{formatKeyLong(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold text-forest md:text-3xl">
            {greeting}
            {user ? `, ${safeName(user)}` : ""} 🌴
          </h1>
          <p className="mt-1 max-w-md text-sm text-ink-soft">{motivation}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/focus">
              <Button size="lg">
                <Target size={18} aria-hidden /> Start a focus session
              </Button>
            </Link>
            <Link href="/garden">
              <Button variant="secondary" size="lg">
                <Sprout size={18} aria-hidden /> Visit the grove
              </Button>
            </Link>
          </div>
        </div>
        <PalmTree coconuts={stats.currentStreak} growing={growing} className="h-40 shrink-0 self-center" />
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ClientOnly fallback={<Skel />}>
          <StatCard
            label="Today's focus"
            icon={<Flame size={15} aria-hidden />}
            value={`${Math.round(todayMs / MS_PER_MINUTE)} min`}
            sub={
              <>
                <ProgressBar fraction={threshold > 0 ? Math.min(1, todayMs / threshold) : 0} label="Daily focus goal progress" showPercent={false} />
                <span className="text-[11px] text-ink-soft">goal {settings.dailyGoalMinutes} min</span>
              </>
            }
          />
        </ClientOnly>
        <ClientOnly fallback={<Skel />}>
          <StatCard label="Sessions today" icon={<Target size={15} aria-hidden />} value={`${todaySessions}`} sub={<span className="text-[11px] text-ink-soft">completed focus sessions</span>} />
        </ClientOnly>
        <ClientOnly fallback={<Skel />}>
          <StatCard
            label="Current streak"
            icon={<Sprout size={15} aria-hidden />}
            value={`${stats.currentStreak}`}
            sub={<span className="text-[11px] text-ink-soft">longest {stats.longestStreak} days</span>}
          />
        </ClientOnly>
        <ClientOnly fallback={<Skel />}>
          <StatCard
            label="Tasks"
            icon={<ListChecks size={15} aria-hidden />}
            value={`${doneTasks}/${tasks.length}`}
            sub={<span className="text-[11px] text-ink-soft">{remainingTasks} remaining</span>}
          />
        </ClientOnly>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Year-week strip */}
        <Card>
          <CardHeader title="Last 7 days" subtitle="One coconut per day" action={<Link href="/garden" className="text-sm font-medium text-palm hover:underline">Full grove →</Link>} />
          <ClientOnly fallback={<div className="p-5" />}>
            <div className="flex items-center justify-between gap-1 p-5">
              {week.map((d) => (
                <div key={d.key} className="flex flex-col items-center gap-1">
                  <CoconutDot status={d.status} size={30} />
                  <span className="text-[10px] text-ink-soft">{d.key.slice(-2)}</span>
                </div>
              ))}
            </div>
          </ClientOnly>
        </Card>

        {/* Priority tasks */}
        <Card>
          <CardHeader title="Today's priority tasks" subtitle="High first, due soonest" action={<Link href="/tasks" className="text-sm font-medium text-palm hover:underline">All tasks →</Link>} />
          <ClientOnly fallback={<div className="p-5" />}>
            <div className="p-4">
              {priority.length === 0 ? (
                <EmptyState icon={<ListChecks size={24} />} title="No open tasks" hint="Add tasks on the Tasks page to plan your day." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {priority.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
                      <button
                        role="checkbox"
                        aria-checked={false}
                        aria-label={`Complete ${t.title}`}
                        onClick={() => {
                          const updated = { ...t, completed: true, completedAt: Date.now() };
                          guestStore.updateTask(t.id, updated);
                          mirrorUpsertTask(updated);
                        }}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-line bg-cream hover:border-palm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm"
                      >
                        <Check size={11} aria-hidden className="opacity-0" />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-sm text-forest">{t.title}</span>
                      <Badge tone={t.priority === "high" ? "terracotta" : t.priority === "medium" ? "brown" : "neutral"}>
                        {t.priority}
                      </Badge>
                      {isOverdue(t, tz) ? <Badge tone="miss">overdue</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ClientOnly>
        </Card>

        {/* Groups summary */}
        <Card>
          <CardHeader
            title="Study group"
            subtitle={configured && user ? "Synced with your account" : "Guest mode — local only"}
            action={<Link href="/groups" className="text-sm font-medium text-palm hover:underline">{localGroup ? "Open →" : "Create →"}</Link>}
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

        {/* Tip of the day */}
        <Card>
          <CardHeader title="Tip of the day" subtitle={tip.category} action={<Link href="/focus-corner" className="text-sm font-medium text-palm hover:underline">Focus Corner →</Link>} />
          <div className="p-5">
            <p className="text-sm font-medium text-forest">{tip.title}</p>
            <p className="mt-1.5 text-sm text-ink-soft">{tip.summary}</p>
            <p className="mt-2 text-xs text-ink-soft">{tip.readMinutes} min read</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-card">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
        <span className="text-palm">{icon}</span> {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-forest">{value}</p>
      {sub ? <div className="mt-1.5 flex flex-col gap-0.5">{sub}</div> : null}
    </div>
  );
}

function Skel() {
  return <div className="rounded-2xl border border-line bg-surface px-4 py-8 shadow-card"><Spinner label="Loading" /></div>;
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
