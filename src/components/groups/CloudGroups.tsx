"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, KeyRound, Plus, Users } from "lucide-react";
import { Button, Card, CardHeader, EmptyState, Field, Spinner, TextInput } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { MAX_GROUP_MEMBERS } from "@/components/groups/GroupsPage";

export interface CloudGroupSummary {
  id: string;
  name: string;
  join_code: string;
  owner_id: string;
  member_count: number;
  role: string;
}

export function CloudGroups({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<CloudGroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const load = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const { data: memberships, error: mErr } = await supabase
      .from("group_members")
      .select("role, groups ( id, name, join_code, owner_id )")
      .eq("user_id", userId);
    if (mErr) {
      setError(mErr.message);
      setGroups([]);
      return;
    }
    const mapped: CloudGroupSummary[] = [];
    for (const m of (memberships ?? []) as unknown as { role: string; groups: { id: string; name: string; join_code: string; owner_id: string } | null }[]) {
      if (!m.groups) continue;
      const { count } = await supabase.from("group_members").select("user_id", { count: "exact", head: true }).eq("group_id", m.groups.id);
      mapped.push({
        id: m.groups.id,
        name: m.groups.name,
        join_code: m.groups.join_code,
        owner_id: m.groups.owner_id,
        role: m.role,
        member_count: count ?? 1,
      });
    }
    setGroups(mapped);
  }, [supabase, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 60) {
      setError("Group name must be 1–60 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: gErr } = await supabase
      .from("groups")
      .insert({ name: trimmed, owner_id: userId })
      .select("id")
      .single();
    if (gErr) {
      setError(gErr.message === "new row violates row-level security policy" ? "You can create a group you own once signed in." : gErr.message);
      setBusy(false);
      return;
    }
    const { error: memErr } = await supabase.from("group_members").insert({ group_id: data.id, user_id: userId, role: "owner" });
    if (memErr) setError(memErr.message);
    setName("");
    await load();
    setNotice("Group created.");
    setBusy(false);
  }

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setError("Enter the full join code.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data: groupId, error: rpcErr } = await supabase.rpc("join_group_by_code", { p_code: trimmed });
    if (rpcErr) {
      const msg = rpcErr.message;
      setError(
        msg.includes("Invalid join code")
          ? "That code doesn't match any group."
          : msg.includes("12 member limit")
            ? "That group is full (12/12)."
            : msg,
      );
      setBusy(false);
      return;
    }
    setCode("");
    await load();
    setNotice("Joined the group 🎉");
    setBusy(false);
    void groupId;
  }

  if (groups === null) return <Spinner label="Loading your groups" />;

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <p role="status" className="rounded-xl bg-palm-wash px-4 py-2.5 text-sm font-medium text-forest">
          <Check size={14} className="mr-1 inline" aria-hidden /> {notice}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Create a group" subtitle={`Max ${MAX_GROUP_MEMBERS} members · you lead`} />
          <form className="flex flex-col gap-4 p-5" onSubmit={createGroup}>
            <Field label="Group name" htmlFor="cloud-group-name">
              <TextInput id="cloud-group-name" value={name} maxLength={60} placeholder="e.g. Physics mornings" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button type="submit" loading={busy} className="w-fit">
              <Plus size={16} aria-hidden /> Create group
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Join with a code" subtitle="Ask a friend for their 8-character code" />
          <form className="flex flex-col gap-4 p-5" onSubmit={joinByCode}>
            <Field label="Join code" htmlFor="cloud-join-code">
              <TextInput id="cloud-join-code" value={code} maxLength={8} className="uppercase font-mono tracking-widest" placeholder="A1B2C3D4" onChange={(e) => setCode(e.target.value)} />
            </Field>
            <Button type="submit" loading={busy} variant="secondary" className="w-fit">
              <KeyRound size={16} aria-hidden /> Join group
            </Button>
          </form>
        </Card>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-miss-wash px-4 py-2.5 text-sm font-medium text-miss">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader title="Your groups" subtitle="Open a room to study together" />
        <div className="p-4">
          {groups.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="No groups yet" hint="Create one above, or join a friend's group with their code." />
          ) : (
            <ul className="flex flex-col gap-2">
              {groups.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-forest">{g.name}</p>
                    <p className="text-xs text-ink-soft">
                      {g.member_count}/{MAX_GROUP_MEMBERS} members · {g.role === "owner" ? "you lead this group" : "member"} · code {g.join_code}
                    </p>
                  </div>
                  <Link href={`/groups/${g.id}`}>
                    <Button variant="secondary" size="sm">
                      Open room
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
