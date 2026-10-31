"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleDot, LogOut, Radio, Timer, Trash2, Users } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Spinner } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLocalGroup } from "@/lib/store";
import { dayKey, formatHoursMinutes } from "@/lib/dates";

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
}

interface SharedSession {
  id: string;
  started_at: string;
  duration_minutes: number;
}

export function CloudGroupRoom({ groupId, userId, onNotFound }: { groupId: string; userId: string; onNotFound?: () => void }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [meta, setMeta] = useState<{ name: string; ownerId: string; joinCode: string } | null>(null);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [todaysMs, setTodaysMs] = useState<Record<string, number>>({});
  const [groupTodayMs, setGroupTodayMs] = useState(0);
  const [shared, setShared] = useState<SharedSession | null>(null);
  const [presence, setPresence] = useState<Record<string, { status: string; focusMinutesToday: number }>>({});
  const [connection, setConnection] = useState<"connecting" | "open" | "closed">("connecting");
  const [startBusy, setStartBusy] = useState(false);

  const loadRoom = useCallback(async () => {
    if (!supabase) return;
    setLoadError(null);
    const { data: group, error: gErr } = await supabase.from("groups").select("name, owner_id, join_code").eq("id", groupId).single();
    if (gErr || !group) {
      const msg = gErr?.message ?? "Missing";
      if (msg.includes("violates row-level security") || msg.includes("no rows")) setAccessDenied(true);
      else setLoadError(msg);
      setRoster([]);
      return;
    }
    setMeta({ name: group.name, ownerId: group.owner_id, joinCode: group.join_code });
    const { data: members, error: mErr } = await supabase
      .from("group_members")
      .select("user_id, role, profiles ( display_name )")
      .eq("group_id", groupId);
    if (mErr) {
      setLoadError(mErr.message);
      setRoster([]);
      return;
    }
    const rows: RosterRow[] = ((members ?? []) as unknown as { user_id: string; role: string; profiles: { display_name: string | null } | null }[]).map((m) => ({
      user_id: m.user_id,
      role: m.role,
      display_name: m.profiles?.display_name ?? null,
    }));
    setRoster(rows);

    // Per-member focus today + honest group total (each session belongs to one user → no double counting).
    const todayStart = new Date(`${dayKey(Date.now())}T00:00:00`);
    const { data: sessions, error: sErr } = await supabase
      .from("focus_sessions")
      .select("user_id, ended_at, active_ms")
      .eq("group_id", groupId)
      .eq("status", "completed")
      .gte("ended_at", todayStart.toISOString());
    if (sErr) {
      setLoadError((p) => p ?? sErr.message);
      return;
    }
    const perMember: Record<string, number> = {};
    let total = 0;
    for (const s of (sessions ?? []) as { user_id: string; active_ms: number }[]) {
      perMember[s.user_id] = (perMember[s.user_id] ?? 0) + s.active_ms;
      total += s.active_ms;
    }
    setTodaysMs(perMember);
    setGroupTodayMs(total);

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

  /* Realtime: presence + new shared sessions + roster changes. */
  useEffect(() => {
    if (!supabase || !meta) return;
    const channel = supabase.channel(`group-room-${groupId}`, { config: { presence: { key: userId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ status: string; focusMinutesToday: number }>();
        const next: Record<string, { status: string; focusMinutesToday: number }> = {};
        Object.keys(state).forEach((key) => {
          const first = state[key]?.[0];
          if (first) next[key] = { status: first.status, focusMinutesToday: first.focusMinutesToday };
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
    void channel.track({ status: "idle", focusMinutesToday: Math.round((todaysMs[userId] ?? 0) / 60_000) });

    return () => {
      setConnection("closed");
      void supabase.removeChannel(channel);
    };
    // re-subscribe when roster identity changes; todaysMs intentionally excluded from deps
    // to avoid churn on every sync tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, groupId, userId, meta?.name]);

  async function startSharedSession(minutes = 25) {
    if (!supabase) return;
    setStartBusy(true);
    const { error } = await supabase.from("group_sessions").insert({ group_id: groupId, created_by: userId, duration_minutes: minutes });
    setStartBusy(false);
    if (error) setLoadError(error.message);
    else await loadRoom();
  }

  async function leaveGroup() {
    if (!supabase) return;
    if (!window.confirm("Leave this group?")) return;
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    if (error) setLoadError(error.message);
    else router.push("/groups");
  }

  async function deleteGroup() {
    if (!supabase) return;
    if (!window.confirm("Delete this group for everyone? This cannot be undone.")) return;
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) setLoadError(error.message);
    else router.push("/groups");
  }

  if (accessDenied) {
    onNotFound?.();
  return <NotFound />;
  }
  if (loadError) return <p role="alert" className="rounded-md bg-miss-wash p-4 text-sm font-medium text-miss">{loadError}</p>;
  if (!meta || !roster) return <Spinner label="Opening room" />;

  const isOwner = meta.ownerId === userId;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <Card>
        <CardHeader
          title={meta.name}
          subtitle={`Join code ${meta.joinCode} · ${roster.length}/12 members`}
          action={
            <Badge tone={connection === "open" ? "palm" : connection === "connecting" ? "brown" : "miss"}>
              <Radio size={11} aria-hidden /> {connection === "open" ? "Live" : connection === "connecting" ? "Connecting…" : "Disconnected"}
            </Badge>
          }
        />
        <div className="flex flex-col gap-5 p-5">
          <SharedSessionPanel shared={shared} onStart={startSharedSession} busy={startBusy} />

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="rounded-md bg-cream px-4 py-3">
              <p className="text-xs font-medium text-ink-soft">Group focus today</p>
              <p className="text-2xl font-semibold text-forest">
                <SessionTotal ms={groupTodayMs} />
              </p>
              <p className="mt-1 text-xs text-ink-soft">Sum of each member&apos;s own completed sessions tagged to this group — no double counting.</p>
            </div>
            <div className="flex gap-2">
              {isOwner ? (
                <Button variant="danger" size="sm" onClick={deleteGroup}>
                  <Trash2 size={14} aria-hidden /> Delete group
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={leaveGroup}>
                  <LogOut size={14} aria-hidden /> Leave group
                </Button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-forest">
              <Users size={15} aria-hidden /> Members ({roster.length})
            </p>
            <ul className="flex flex-col gap-2">
              {roster.map((m) => {
                const mins = Math.round((todaysMs[m.user_id] ?? 0) / 60_000);
                const live = presence[m.user_id];
                const statusLabel =
                  live?.status === "focusing"
                    ? "focusing now"
                    : live?.status === "on-break"
                      ? "on break"
                      : live
                        ? "in the room"
                        : "offline";
                return (
                  <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-4 py-3">
                    <span className="text-sm font-medium text-forest">
                      {m.display_name || shortenId(m.user_id)}
                      {m.user_id === userId ? " (you)" : ""}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={m.role === "owner" ? "palm" : "neutral"}>{m.role === "owner" ? "leader" : "member"}</Badge>
                      <Badge tone="neutral">
                        <CircleDot size={11} aria-hidden /> {statusLabel}
                      </Badge>
                      <span className="text-xs text-ink-soft">today: {mins} min</span>
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
        <p className="text-xs font-medium text-ink-soft">Shared session {done ? "complete — start another?" : "in progress"}</p>
        <p className="tnum mt-1 font-display text-4xl font-medium text-forest">
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
    <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-line bg-cream/60 p-4">
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

function SessionTotal({ ms }: { ms: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => force((v) => v + 1), 0);
    return () => window.clearTimeout(t);
  }, []);
  return <>{formatHoursMinutes(ms)}</>;
}

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shortenId(id: string): string {
  return `student-${id.slice(0, 4)}`;
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
    <Link href="/groups" className={`inline-flex items-center gap-1 text-sm font-medium text-palm hover:underline ${inline ? "" : "w-fit"}`}>
      <ArrowLeft size={15} aria-hidden /> All groups
    </Link>
  );
}
