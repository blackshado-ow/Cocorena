"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft, CircleDot, LogOut, Radio, Timer, Trash2, UserMinus, Users } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Spinner } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLocalGroup, useSettings, useSessions, useTimerSnapshots } from "@/lib/store";
import { dayKey, formatHoursMinutes } from "@/lib/dates";
import {
  deleteCloudGroup,
  leaveGroup,
  regenerateJoinCode,
  removeGroupMember,
  setInvitationsEnabled,
  joinLinkForCode,
} from "@/lib/supabase/groups";
import { useMounted } from "@/hooks/use-mounted";
import { presencePayload, STATUS_LABEL, profileInitials } from "@/lib/social-utils";

/* ------------------------------ local demo room ------------------------------ */

export function LocalGroupRoom({ groupId }: { groupId: string }) {
  const group = useLocalGroup();
  if (!group || group.id !== groupId) {
  return <NotFound />;
  }
  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <Card>
        <CardHeader title={group.name} subtitle="Local demo room" action={<Badge tone="brown">local only</Badge>} />
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-cream px-4 py-3">
            <span className="text-xs font-medium text-ink-soft">Join code</span>
            <span className="tnum font-mono text-lg font-semibold tracking-widest text-forest">{group.joinCode}</span>
          </div>
          <ul className="flex flex-col gap-2">
            <li className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3">
              <span className="text-sm font-medium text-forest">You</span>
              <Badge tone="palm">leader</Badge>
            </li>
          </ul>
          <p className="text-sm text-ink-soft">
            This demo room lives in your browser. Presence, live status, and shared sessions need cloud sign-in — see the Groups page or the
            README (&quot;Supabase setup&quot;). Nothing here pretend-fakes other members.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------- cloud room ---------------------------------- */

interface RosterRow {
  user_id: string;
  role: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface SharedSession {
  id: string;
  started_at: string;
  duration_minutes: number;
}

type ConnectionState = "connecting" | "open" | "closed";

export function CloudGroupRoom({ groupId, userId, onNotFound }: { groupId: string; userId: string; onNotFound?: () => void }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [meta, setMeta] = useState<{ name: string; ownerId: string; joinCode: string; description: string | null; invitationsEnabled: boolean } | null>(null);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [presence, setPresence] = useState<Record<string, { status: string; focus_minutes_today: number }>>({});
  const [shared, setShared] = useState<SharedSession | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [startBusy, setStartBusy] = useState(false);
  const [ownerNotice, setOwnerNotice] = useState<string | null>(null);

  const mounted = useMounted();

  const loadRoom = useCallback(async () => {
    if (!supabase) return;
    setLoadError(null);
    const { data: group, error: gErr } = await supabase.from("groups").select("name, owner_id, join_code, description, invitations_enabled").eq("id", groupId).single();
    if (gErr || !group) {
      const msg = "message" in (gErr ?? {}) ? gErr!.message : "Missing";
      if (msg.includes("violates row-level security") || msg.includes("no rows")) setAccessDenied(true);
      else setLoadError(msg);
      setRoster([]);
      return;
    }
    setMeta({
      name: group.name,
      ownerId: group.owner_id,
      joinCode: group.join_code,
      description: group.description ?? null,
      invitationsEnabled: group.invitations_enabled,
    });
    const { data: members, error: mErr } = await supabase
      .from("group_members")
      .select("user_id, role, profiles ( display_name, username, avatar_url )")
      .eq("group_id", groupId);
    if (mErr) {
      setLoadError(mErr.message);
      setRoster([]);
      return;
    }
    const rows: RosterRow[] = ((members ?? []) as unknown as {
      user_id: string; role: string; profiles: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
    }[]).map((m) => ({
      user_id: m.user_id,
      role: m.role,
      display_name: m.profiles?.display_name ?? null,
      username: m.profiles?.username ?? null,
      avatar_url: m.profiles?.avatar_url ?? null,
    }));
    setRoster(rows);

    const { data: latest } = await supabase
      .from("group_sessions")
      .select("id, started_at, duration_minutes")
      .eq("group_id", groupId)
      .order("started_at", { ascending: false })
      .limit(1);
    const latestSession = (latest ?? [])[0] as SharedSession | undefined;
    if (latestSession) {
      const startedAt = new Date(latestSession.started_at).getTime();
      const endsAt = startedAt + latestSession.duration_minutes * 60_000;
      if (endsAt > Date.now()) setShared(latestSession);
    }
  }, [supabase, groupId]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  /* Presence + shared-session realtime. Status is broadcast through the room's
   * presence channel only while the room is open; fallback: refetch polling. */
  const channelRef = useRef<RealtimeChannel | null>(null);
  useEffect(() => {
    if (!supabase || !meta) return;
    const channel = supabase.channel(`group-room-${groupId}`, { config: { presence: { key: userId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ status: string; focus_minutes_today: number }>();
        const next: Record<string, { status: string; focus_minutes_today: number }> = {};
        Object.keys(state).forEach((key) => {
          const first = state[key]?.[0];
          if (first) next[key] = { status: first.status, focus_minutes_today: first.focus_minutes_today };
        });
        setPresence(next);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_sessions", filter: `group_id=eq.${groupId}` }, (payload) => {
        const row = payload.new as SharedSession;
        const endsAt = new Date(row.started_at).getTime() + row.duration_minutes * 60_000;
        if (endsAt > Date.now()) setShared(row);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, () => {
        void loadRoom();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("open");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("closed");
      });
    channelRef.current = channel;
    setPresence({});

    return () => {
      channelRef.current = null;
      setConnection("closed");
      void supabase.removeChannel(channel);
    };
  }, [supabase, groupId, userId, meta?.name, loadRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Broadcast my own study status into presence while the room is open. */
  const timers = useTimerSnapshots();
  const sessions = useSessions();
  const settings = useSettings();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!supabase || connection !== "open") return;
    const tz = settings.timezone;
    const key = mounted ? dayKey(Date.now(), tz) : "";
    const todayMinutes = sessions
      .filter((s) => s.status === "completed" && s.kind !== "pomodoro_break" && dayKey(s.endedAt ?? s.startedAt, tz) === key)
      .reduce((a, s) => a + s.activeMs, 0);
    const payload = presencePayload({
      pomodoroRunningFocus: timers.pomodoro.status === "running" && timers.pomodoro.mode === "focus",
      stopwatchRunning: timers.stopwatch.status === "running",
      countdownRunning: timers.countdown.status === "running",
      pomodoroPaused: timers.pomodoro.status === "paused",
      todayMinutes: Math.floor(todayMinutes / 60_000),
    });
    const channel = channelRef.current;
    if (!channel) return;
    channel.track(payload);
  }, [supabase, connection, timers, sessions, settings.timezone, mounted, tick]);

  /* Polling fallback when realtime is unavailable or misconfigured. */
  useEffect(() => {
    if (connection !== "closed") return;
    const id = window.setInterval(() => {
      void loadRoom();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [connection, loadRoom]);

  async function startSharedSession(minutes = 25) {
    if (!supabase) return;
    setStartBusy(true);
    const { error } = await supabase.from("group_sessions").insert({ group_id: groupId, created_by: userId, duration_minutes: minutes });
    setStartBusy(false);
    if (error) setLoadError(error.message);
    else await loadRoom();
  }

  async function handleLeave() {
    if (!window.confirm("Leave this group?")) return;
    const res = await leaveGroup(groupId);
    if (!res.ok) setLoadError(res.error);
    else router.push("/groups");
  }

  async function handleDelete() {
    if (!window.confirm("Delete this group for everyone? This cannot be undone.")) return;
    const res = await deleteCloudGroup(groupId);
    if (!res.ok) setLoadError(res.error);
    else router.push("/groups");
  }

  async function handleRegenerate() {
    if (!window.confirm("Replace the join code? Old links stop working immediately.")) return;
    const res = await regenerateJoinCode(groupId);
    if (res.ok) {
      setOwnerNotice("New join code is active — old links no longer work.");
      await loadRoom();
    } else setOwnerNotice(res.error);
  }

  async function handleToggleInvitations() {
    if (!meta) return;
    const res = await setInvitationsEnabled(groupId, !meta.invitationsEnabled);
    if (res.ok) {
      setOwnerNotice(res.value ? "Invitations are open again." : "Invitations are paused — new codes won't be accepted.");
      await loadRoom();
    } else setOwnerNotice(res.error);
  }

  async function handleRemoveMember(memberId: string, label: string) {
    if (!window.confirm(`Remove ${label} from the group?`)) return;
    const res = await removeGroupMember(groupId, memberId);
    if (res.ok) {
      setOwnerNotice(`${label} was removed.`);
      await loadRoom();
    } else setOwnerNotice(res.error);
  }

  if (accessDenied) {
    onNotFound?.();
    return <NotFound />;
  }
  if (loadError) return <p role="alert" className="rounded-md bg-miss-wash p-4 text-sm font-medium text-miss">{loadError}</p>;
  if (!meta || !roster) return <Spinner label="Opening room" />;

  const isOwner = meta.ownerId === userId;
  const groupTodayMinutes = Object.values(presence)
    .reduce((a, m) => a + (m.focus_minutes_today ?? 0), 0);

  function memberLabel(m: RosterRow): string {
    if (m.user_id === userId) return "You";
    return m.display_name?.trim() || m.username || `student-${m.user_id.slice(0, 4)}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <Card>
        <CardHeader
          title={meta.name}
          subtitle={
            meta.description
              ? `Join code ${meta.joinCode} · ${roster.length}/12 members · ${meta.description}`
              : `Join code ${meta.joinCode} · ${roster.length}/12 members`
          }
          action={
            <Badge tone={connection === "open" ? "palm" : connection === "connecting" ? "brown" : "miss"}>
              <Radio size={11} aria-hidden /> {connection === "open" ? "Live" : connection === "connecting" ? "Connecting…" : "Reconnecting"}
            </Badge>
          }
        />
        <div className="flex flex-col gap-5 p-5">
          <SharedSessionPanel shared={shared} onStart={startSharedSession} busy={startBusy} />

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="rounded-md bg-cream px-4 py-3">
              <p className="eyebrow text-ink-soft">Group focus today</p>
              <p className="font-display text-2xl font-medium text-forest">{formatHoursMinutes(groupTodayMinutes * 60_000)}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Sum of the minutes members currently broadcast in the room — each person shares their own total; nobody sees
                anybody&apos;s task list or session history.
              </p>
            </div>
            <div className="flex flex-row gap-2">
              {isOwner ? (
                <>
                  <Button variant="secondary" size="sm" onClick={handleRegenerate}>
                    New join code
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleToggleInvitations}>
                    {meta.invitationsEnabled ? "Pause invitations" : "Open invitations"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDelete}>
                    <Trash2 size={14} aria-hidden /> Delete group
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={handleLeave}>
                  <LogOut size={14} aria-hidden /> Leave group
                </Button>
              )}
            </div>
          </div>

          {ownerNotice ? (
            <p role="status" className="rounded-md bg-palm-wash px-4 py-2 text-sm font-medium text-palm-deep">
              {ownerNotice}
            </p>
          ) : null}

          {isOwner ? (
            <div className="rounded-md border border-line bg-cream/60 px-4 py-3 text-xs text-ink-soft">
              <span className="font-medium text-forest">Share this link:</span>{" "}
              <span className="font-mono">{joinLinkForCode(meta.joinCode)}</span> — anyone signed in can join while
              invitations are open.
            </div>
          ) : null}

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-forest">
              <Users size={15} aria-hidden /> Members ({roster.length})
            </p>
            <ul className="flex flex-col gap-2">
              {roster.map((m) => {
                const live = presence[m.user_id];
                const minutes = live?.focus_minutes_today ?? 0;
                const status = live ? STATUS_LABEL[live.status] ?? "in the room" : "offline";
                return (
                  <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line/80 bg-surface px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-palm-wash font-display text-xs font-medium text-palm-deep" aria-hidden>
                        {profileInitials(memberLabel(m))}
                      </span>
                      <span className="text-sm font-medium text-forest">
                        {memberLabel(m)}
                        {m.username ? <span className="text-ink-soft"> @{m.username}</span> : null}
                      </span>
                    </div>
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={m.role === "owner" ? "palm" : "neutral"}>{m.role === "owner" ? "leader" : "member"}</Badge>
                      <Badge tone={live ? "brown" : "neutral"}>
                        <CircleDot size={11} aria-hidden /> {status}
                      </Badge>
                      {live ? <span className="text-xs text-ink-soft">today: {minutes} min</span> : null}
                      {isOwner && m.user_id !== userId && m.role !== "owner" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove ${memberLabel(m)}`}
                          onClick={() => void handleRemoveMember(m.user_id, memberLabel(m))}
                        >
                          <UserMinus size={15} aria-hidden />
                        </Button>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SharedSessionPanel({ shared, onStart, busy }: {
  shared: SharedSession | null;
  onStart: (minutes: number) => void;
  busy: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!shared) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [shared]);

  if (shared) {
    const endsAt = new Date(shared.started_at).getTime() + shared.duration_minutes * 60_000;
    const remaining = Math.max(0, endsAt - now);
    const done = remaining === 0;
    // Display time is always computed from the shared start timestamp — never a local independent countdown.
    return (
      <div className="rounded-md border border-line bg-palm-wash p-4 text-center">
        <p className="eyebrow text-ink-soft">Shared session {done ? "complete — start another?" : "in progress"}</p>
        <p className="tnum font-display mt-1 text-4xl font-medium text-forest">
          {done ? "Complete" : formatClock(remaining)}
        </p>
        {!done ? <p className="text-xs text-ink-soft">synchronized from the shared start time</p> : null}
        <Button size="sm" variant="secondary" className="mt-3" loading={busy} onClick={() => onStart(25)}>
          <Timer size={14} aria-hidden /> Start a new 25-min session
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-dashed border-line bg-cream/60 p-4">
      <div>
        <p className="text-sm font-medium text-forest">No shared session running</p>
        <p className="text-xs text-ink-soft">Everyone sees the same countdown — time is measured from one shared start stamp.</p>
      </div>
      <Button loading={busy} onClick={() => onStart(25)}>
        <Timer size={16} aria-hidden /> Start 25-min session
      </Button>
    </div>
  );
}

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function NotFound() {
  return (
    <EmptyState
      title="Group not found"
      hint="You may have left this group, or it no longer exists."
      action={<BackLink inline />}
    />
  );
}

function BackLink({ inline }: { inline?: boolean }) {
  return (
    <Link href="/groups" className={`inline-flex items-center gap-1 text-sm font-medium text-palm-deep hover:underline ${inline ? "" : "w-fit"}`}>
      <ArrowLeft size={15} aria-hidden /> All groups
    </Link>
  );
}
