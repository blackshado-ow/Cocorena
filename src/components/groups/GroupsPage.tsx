"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Info, LogOut, Users } from "lucide-react";
import { Badge, Button, Card, CardHeader, ClientOnly, Field, Spinner, TextInput } from "@/components/ui/primitives";
import { guestStore, useLocalGroup } from "@/lib/store";
import { uid } from "@/lib/storage";
import { useCloudUser } from "@/lib/supabase/auth-state";
import { CloudGroups } from "@/components/groups/CloudGroups";

export const MAX_GROUP_MEMBERS = 12;

function generateJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function LocalGroupsDemo() {
  const group = useLocalGroup();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  function createGroup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 60) {
      setError("Group name must be 1–60 characters.");
      return;
    }
    guestStore.setLocalGroup({
      id: uid(),
      name: trimmed,
      joinCode: generateJoinCode(),
      createdAt: Date.now(),
      ownerId: "local-user",
      memberIds: ["local-user"],
    });
    setName("");
    setError(null);
    setCreated(true);
  }

  if (group) {
    return (
      <Card>
        <CardHeader
          title={group.name}
          subtitle="Local demo group — this device only"
          action={
            <Link href={`/groups/${group.id}`}>
              <Button variant="secondary" size="sm">
                Open room
              </Button>
            </Link>
          }
        />
        <div className="flex flex-col gap-4 p-5">
          {created ? (
            <p className="flex items-center gap-2 text-sm font-medium text-palm" role="status">
              <Check size={15} aria-hidden /> Group created. Share the code with friends (once cloud sign-in exists, they can join from anywhere).
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-cream px-4 py-3">
            <span className="text-xs font-medium text-ink-soft">Join code</span>
            <span className="tnum font-mono text-lg font-semibold tracking-widest text-forest">{group.joinCode}</span>
            <Badge tone="brown">1 / {MAX_GROUP_MEMBERS} members</Badge>
          </div>
          <p className="text-sm text-ink-soft">
            <strong className="text-forest">What this demo is:</strong> a local-only space on this browser. Members list, presence, and
            synchronized sessions require cloud sign-in — without Supabase credentials there is genuinely no way for another device to
            appear here, and Cocorena won&apos;t pretend otherwise.
          </p>
          <div>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm("Leave and delete this local group?")) guestStore.setLocalGroup(null);
              }}
            >
              <LogOut size={15} aria-hidden /> Leave group
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Create a study group" subtitle="Free — stored locally until cloud sign-in" />
      <form className="flex flex-col gap-4 p-5" onSubmit={createGroup}>
        <Field label="Group name" htmlFor="group-name" error={error ?? undefined}>
          <TextInput
            id="group-name"
            value={name}
            maxLength={60}
            placeholder="e.g. Botany squad"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-fit">
          <Users size={16} aria-hidden /> Create group
        </Button>
      </form>
    </Card>
  );
}

export function GroupsPage() {
  const { configured, loading, user } = useCloudUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-forest">Study groups</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Study together, gently. Groups cap at {MAX_GROUP_MEMBERS} members so everyone stays visible.
        </p>
      </div>

      <ClientOnly fallback={<Spinner label="Checking groups" />}>
        {loading && configured ? (
          <Spinner label="Checking sign-in" />
        ) : configured && user ? (
          <CloudGroups userId={user.id} />
        ) : configured && !user ? (
          <div className="flex flex-col gap-4">
            <Card className="flex items-start gap-3 p-5">
              <Info size={18} className="mt-0.5 shrink-0 text-palm" aria-hidden />
              <p className="text-sm text-ink-soft">
                <strong className="text-forest">Sign in to unlock real groups.</strong> With an account, members across devices share
                presence, focus totals, and synchronized sessions. Until then the local demo below works the same way — minus other humans.
                <Link href="/auth" className="ml-2 font-medium text-palm hover:underline">
                  Go to sign in →
                </Link>
              </p>
            </Card>
            <LocalGroupsDemo />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Card className="flex items-start gap-3 p-5">
              <Info size={18} className="mt-0.5 shrink-0 text-palm" aria-hidden />
              <p className="text-sm text-ink-soft">
                <strong className="text-forest">Cloud not configured.</strong> Study-group synchronization needs a Supabase project (see
                README → Supabase setup). Meanwhile, here is a local demo: everything stays in your browser, honestly labeled.
              </p>
            </Card>
            <LocalGroupsDemo />
          </div>
        )}
      </ClientOnly>
    </div>
  );
}
