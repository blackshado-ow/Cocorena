"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, KeyRound, Plus, Users } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Spinner, TextInput } from "@/components/ui/primitives";
import {
  createCloudGroup,
  joinByInvitationCode,
  loadMyGroups,
  type MyGroupSummary,
} from "@/lib/supabase/groups";
import { MAX_GROUP_MEMBERS } from "@/components/groups/GroupsPage";

export function CloudGroups(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _props: { userId: string },
) {
  const [groups, setGroups] = useState<MyGroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [busyCreate, setBusyCreate] = useState(false);
  const [busyJoin, setBusyJoin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setGroups(null);
    const res = await loadMyGroups();
    if (res.ok) {
      setGroups(res.value);
      setError(null);
    } else {
      setError(res.error);
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (busyCreate) return;
    setBusyCreate(true);
    setError(null);
    const res = await createCloudGroup({ name, description: description || null });
    setBusyCreate(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setName("");
    setDescription("");
    setNotice("Group created. Your join code is on the group card — open the room to manage invitations.");
    await load();
  }

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (busyJoin) return;
    setBusyJoin(true);
    setError(null);
    const res = await joinByInvitationCode(code);
    setBusyJoin(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCode("");
    setNotice("Joined the group.");
    await load();
  }

  if (groups === null && !error) return <Spinner label="Loading your groups" />;

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <p role="status" className="rounded-md bg-palm-wash px-4 py-2.5 text-sm font-medium text-palm-deep">
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
            <Field label="Description (optional)" htmlFor="cloud-group-description" hint="A line about how this group studies — shown to invited members.">
              <TextInput id="cloud-group-description" value={description} maxLength={280} placeholder="e.g. 7:00 weekdays, deep work" onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Button type="submit" loading={busyCreate} className="w-fit">
              <Plus size={16} aria-hidden /> Create group
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Join with a code" subtitle="From an invitation link or a friend's message" />
          <form className="flex flex-col gap-4 p-5" onSubmit={joinByCode}>
            <Field label="Invitation code" htmlFor="cloud-join-code">
              <TextInput
                id="cloud-join-code"
                value={code}
                maxLength={8}
                className="uppercase font-mono tracking-widest"
                placeholder="A1B2C3D4"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </Field>
            <Button type="submit" loading={busyJoin} variant="secondary" className="w-fit">
              <KeyRound size={16} aria-hidden /> Join group
            </Button>
          </form>
        </Card>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-miss-wash px-4 py-2.5 text-sm font-medium text-miss">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader title="Your groups" subtitle="Open a room to study together" />
        <div className="p-4">
          {groups?.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="No groups yet" hint="Create one above, or join a friend's group with their code." />
          ) : (
            <ul className="flex flex-col gap-2">
              {groups?.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line/80 bg-surface px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-forest">
                      {g.name}
                      {g.role === "owner" ? <Badge tone="palm">owner</Badge> : null}
                    </p>
                    {g.description ? <p className="truncate text-xs text-ink-soft">{g.description}</p> : null}
                    <p className="text-xs text-ink-soft">
                      code {g.join_code} · {g.invitations_enabled ? "invitations open" : "invitations paused"}
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
