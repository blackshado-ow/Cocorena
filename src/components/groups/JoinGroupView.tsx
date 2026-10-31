"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Users } from "lucide-react";
import { Button, Card, CardHeader, Field, Spinner, TextInput } from "@/components/ui/primitives";
import { PageHeading } from "@/components/shell/PageHeading";
import { useCloudUser } from "@/lib/supabase/auth-state";
import { joinByInvitationCode } from "@/lib/supabase/groups";
import { normalizeFriendCode } from "@/lib/social-utils";
import { useMounted } from "@/hooks/use-mounted";

export function JoinGroupView() {
  const { configured, loading, user } = useCloudUser();
  const router = useRouter();
  const mounted = useMounted();
  /* The code arrives via the shared invitation link (?code=…). It is read
   * directly from the URL after mount so the page can prerender single-flush. */
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const raw = new URLSearchParams(window.location.search).get("code") ?? "";
    if (raw) setCode(normalizeFriendCode(raw) ?? raw);
  }, [mounted]);

  /* After a successful join, route into the shared room. */
  useEffect(() => {
    if (!joined) return;
    const t = window.setTimeout(() => router.push(`/groups/${joined}`), 900);
    return () => window.clearTimeout(t);
  }, [joined, router]);

  const heading = (
    <PageHeading
      title="Join a study group"
      eyebrow="Together"
      sprig={false}
      subtitle="Open an invitation link, or paste its 8-character code below. The server validates the code, the membership cap, and whether invitations are still open."
    />
  );

  if (!configured) return <div className="flex flex-col gap-6">{heading}<CloudDown /></div>;
  if (loading) return <div className="py-10"><Spinner label="Checking sign-in" /></div>;

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <Card className="p-6">
          <p className="text-sm leading-relaxed text-ink-soft">
            Joining a shared group needs an account so other members can see you. Your guest data stays local and can be
            imported after signing in.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Link href="/auth" className="inline-flex">
              <Button>
                <LogIn size={15} aria-hidden /> Sign in to join
              </Button>
            </Link>
            {code ? (
              <Link
                href="/auth"
                className="inline-flex items-center rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink-soft hover:bg-brown-wash/60"
              >
                Your link code: <span className="tnum ml-1 font-mono font-semibold text-forest">{code}</span> — sign in,
                then reopen this link.
              </Link>
            ) : null}
          </div>
        </Card>
      </div>
    );
  }

  async function join() {
    setBusy(true);
    setError(null);
    const res = await joinByInvitationCode(code);
    setBusy(false);
    if (res.ok) {
      setJoined(res.value);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {heading}
      {joined === null ? (
        <Card>
          <CardHeader title="Enter the invitation code" subtitle="Each group has one active code; owners can pause invitations." />
          <form
            className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void join();
            }}
          >
            <Field label="Invitation code" htmlFor="join-code" error={error ?? undefined}>
              <TextInput
                id="join-code"
                value={code}
                maxLength={8}
                className="uppercase font-mono tracking-widest"
                placeholder="AB2CD4F9"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                invalid={!!error}
              />
            </Field>
            <Button type="submit" loading={busy} disabled={busy}>
              <Users size={16} aria-hidden /> Join group
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-6">
          <p role="status" className="text-sm font-medium text-palm-deep">
            You&apos;re in. Opening the room…
          </p>
        </Card>
      )}
    </div>
  );
}

function CloudDown() {
  return (
    <Card className="flex items-start gap-3 p-5">
      <p className="text-sm text-ink-soft">
        <strong className="text-forest">Cloud not configured.</strong> Shared groups need Supabase credentials (README →
        Supabase setup). Local demo groups stay available on the{" "}
        <Link href="/groups" className="font-medium text-palm-deep hover:underline">
          Groups page
        </Link>
        .
      </p>
    </Card>
  );
}
