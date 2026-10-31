"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { CheckCircle2, CloudOff, Mail, Wand2 } from "lucide-react";
import { Badge, Button, Card, Field, Segmented, TextInput } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCloudUser } from "@/lib/supabase/auth-state";
import { claimUsername, fetchOwnProfile } from "@/lib/supabase/profile";
import { importGuestDataToCloud } from "@/lib/supabase/sync";
import { guestStore } from "@/lib/store";
import { PageHeading } from "@/components/shell/PageHeading";

/** What happens right after signing in: claim a username, then confirm the
 * guest-data import (explicitly — nothing is uploaded without consent). */
type Flow = "idle" | "claim" | "import";

export function AuthPage() {
  const { configured, loading, user } = useCloudUser();
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>("idle");

  useEffect(() => {
    if (!user) setFlow("idle");
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const heading = (
    <PageHeading
      title="Sign in"
      eyebrow="Cloud sync"
      subtitle="Guest mode stays available; signing in syncs your streak and groups across devices."
    />
  );

  if (!configured) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading
          title="Sign in"
          eyebrow="Cloud sync"
          subtitle="Cloud accounts aren&apos;t set up yet — Cocorena keeps working in guest mode."
        />
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <CloudOff size={18} className="mt-0.5 shrink-0 text-brown" aria-hidden />
            <div className="text-sm text-ink-soft">
              <p className="font-medium text-forest">To enable sign-in:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Create a free project at supabase.com (free tier is enough).</li>
                <li>Open Project Settings → API and copy the Project URL and anon/public key.</li>
                <li>Paste them into <code className="rounded bg-brown-wash px-1 font-mono">.env.local</code> as NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (values only — never commit that file).</li>
                <li>Run the SQL in supabase/migrations/0001_init.sql and 0002_accounts_friends_groups.sql in the Supabase SQL editor (README has every step).</li>
                <li>Restart the dev server. This page becomes a working sign-in. All timers, tasks and streaks already work without it.</li>
              </ol>
            </div>
          </div>
        </Card>
        <Card className="p-5 text-sm text-ink-soft">
          Guest data lives in this browser — you can sign in later and import it into your account from Settings.
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <Card className="p-6 text-sm text-ink-soft">Checking your session…</Card>
      </div>
    );
  }

  if (user) {
    if (flow !== "idle") {
      return (
        <div className="flex flex-col gap-6">
          {heading}
          {flow === "claim" ? (
            <ClaimUsernameCard
              onContinue={() => setFlow("import")}
            />
          ) : (
            <ImportConfirmationCard
              user={user}
              onDone={(imported) => {
                setFlow("idle");
                router.push("/");
                if (imported) window.setTimeout(() => router.refresh(), 0);
              }}
            />
          )}
        </div>
      );
    }
    return <SignedInView email={user.email ?? "your account"} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {heading}
      <AuthForms onAuthenticated={async () => {
        try {
          const res = await fetchOwnProfile();
          setFlow("profile" in res && res.profile.username === null ? "claim" : "import");
          return;
        } catch {
          setFlow("import");
        }
      }} />
    </div>
  );
}

/* ------------------------------------------------------------------- forms */

type FormPhase = "signin" | "signup" | "forgot" | "reset";

function AuthForms({ onAuthenticated }: { onAuthenticated: () => void | Promise<void> }) {
  const supabase = getSupabaseBrowserClient();
  const [phase, setPhase] = useState<FormPhase>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Password-reset email links arrive back here as /auth/callback?next=/auth?reset=1.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      setPhase("reset");
      setPassword("");
      setConfirm("");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function validatePassword(): boolean {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (phase === "signup" && password !== confirm) {
      setError("Passwords don't match.");
      return false;
    }
    return true;
  }

  async function afterSignIn(): Promise<void> {
    await onAuthenticated();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!validatePassword()) return;
    setBusy(true);
    setError(null);
    if (phase === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(friendly(err.message));
      else await afterSignIn();
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) setError(friendly(err.message));
      else {
        setNotice("Account created. If email confirmation is enabled in your Supabase project, check your inbox; otherwise you're being signed in…");
        const { data: session } = await supabase.auth.getUser();
        if (session?.user) await afterSignIn();
      }
    }
    setBusy(false);
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    // The reset email sends the user through the code-exchange route; the
    // callback then lands back on this page in set-a-new-password mode.
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth?reset=1")}`
        : undefined;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);
    if (err) setError(friendly(err.message));
    else {
      setNotice("Password reset link sent — open that email on this device to choose a new password.");
      setPhase("signin");
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(friendly(err.message));
    else {
      setNotice("Password updated. Sign in with the new password.");
      setPassword("");
      setConfirm("");
      setPhase("signin");
    }
  }

  async function magicLink(e: React.MouseEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    const requestUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: requestUrl } });
    if (err) setError(friendly(err.message));
    else setNotice("Magic link sent — open the email on this device to finish signing in.");
    setBusy(false);
  }

  const isReset = phase === "reset";

  return (
    <div className="flex flex-col gap-6">
      {isReset ? (
        <Card>
          <CardTitle title="Set a new password" subtitle="You followed a recovery link — choose a fresh password." />
          <form className="flex flex-col gap-4 p-6" onSubmit={submitReset}>
            <Field label="New password" htmlFor="auth-password" hint="At least 8 characters">
              <TextInput id="auth-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!error} />
            </Field>
            <Field label="Confirm new password" htmlFor="auth-confirm">
              <TextInput id="auth-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!error} />
            </Field>
            <Feedback error={error} notice={notice} />
            <Button type="submit" loading={busy} size="lg">
              Save new password
            </Button>
            <p className="text-xs text-ink-soft">Didn&apos;t get a reset email?{" "}
              <button type="button" className="font-medium text-palm-deep hover:underline" onClick={() => setPhase("forgot")}>
                Send a new link
              </button>
            </p>
          </form>
        </Card>
      ) : phase === "forgot" ? (
        <Card>
          <CardTitle title="Forgot password" subtitle="We'll email a recovery link; it works on the device you open it on." />
          <form className="flex flex-col gap-4 p-6" onSubmit={submitForgot}>
            <Field label="Email" htmlFor="auth-email">
              <TextInput id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} />
            </Field>
            <Feedback error={error} notice={notice} />
            <Button type="submit" loading={busy} size="lg">
              <Mail size={16} aria-hidden /> Send reset link
            </Button>
            <p className="text-xs text-ink-soft">
              <button type="button" className="font-medium text-palm-deep hover:underline" onClick={() => setPhase("signin")}>
                Back to sign in
              </button>
            </p>
          </form>
        </Card>
      ) : (
        <Card className="p-6">
          <Segmented
            ariaLabel="Choose account mode"
            value={phase}
            onChange={(m) => {
              setPhase(m);
              setError(null);
              setNotice(null);
            }}
            options={[
              { value: "signin", label: "Sign in" },
              { value: "signup", label: "Create account" },
            ]}
          />

          <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
            <Field label="Email" htmlFor="auth-email">
              <TextInput id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} />
            </Field>
            <Field label="Password" htmlFor="auth-password" hint="At least 8 characters">
              <TextInput id="auth-password" type="password" autoComplete={phase === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!error} />
            </Field>
            {phase === "signup" ? (
              <Field label="Confirm password" htmlFor="auth-confirm">
                <TextInput id="auth-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!error} />
              </Field>
            ) : null}
            {phase === "signin" ? (
              <p className="text-xs">
                <button type="button" className="font-medium text-palm-deep hover:underline" onClick={() => { setError(null); setNotice(null); setPhase("forgot"); }}>
                  Forgot password?
                </button>
              </p>
            ) : null}

            <Feedback error={error} notice={notice} />

            <Button type="submit" loading={busy} size="lg">
              {phase === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs text-ink-soft">No password? Use a magic link:</p>
            <div className="mt-2 flex gap-2">
              <TextInput
                type="email"
                aria-label="Email for magic link"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="secondary" onClick={magicLink} loading={busy} disabled={busy}>
                <Mail size={15} aria-hidden /> Email me a link
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <p className="flex items-center gap-2 text-xs text-ink-soft">
          <Wand2 size={13} aria-hidden />
          Right after signing in you can claim a username, and Cocorena will <em>ask</em> before importing your guest
          data — nothing is uploaded without your OK. Passwords are handled entirely by Supabase Auth and never touch
          app storage.{" "}
          <Link href="/settings" className="font-medium text-palm hover:underline">
            Settings →
          </Link>
        </p>
      </Card>

      <p className="text-center text-xs text-ink-soft">
        <Badge tone="neutral">guest mode</Badge> you can always skip signing in
      </p>
    </div>
  );
}

/* ------------------------------------------- post-sign-in: username claim */

function ClaimUsernameCard({ onContinue }: { onContinue: () => void }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardTitle
        title="Claim your username"
        subtitle="How friends find you besides your friend code. You can also claim one later on your profile page."
      />
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          const res = await claimUsername(username);
          setBusy(false);
          if ("profile" in res) onContinue();
          else setError(res.error);
        }}
      >
        <Field label="Username" htmlFor="auth-claim" error={error ?? undefined} hint="3–24 characters: lowercase letters, numbers, underscores.">
          <TextInput
            id="auth-claim"
            value={username}
            maxLength={24}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. study_owl"
            onChange={(e) => setUsername(e.target.value)}
            invalid={!!error}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy}>
            Claim username
          </Button>
          <Button type="button" variant="ghost" onClick={onContinue}>
            Later — continue
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------------ post-sign-in: explicit guest import */

function ImportConfirmationCard({ user, onDone }: { user: User; onDone: (imported: boolean) => void }) {
  const counts = { tasks: guestStore.getTasks().length, sessions: guestStore.getSessions().length };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nothingToImport = counts.tasks === 0 && counts.sessions === 0;

  useEffect(() => {
    if (nothingToImport) onDone(false);
  }, [nothingToImport]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runImport(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await importGuestDataToCloud(user);
    setBusy(false);
    if (result.ok) onDone(true);
    else setError(result.error ?? "Import failed.");
  }

  if (nothingToImport) return null;

  return (
    <Card>
      <CardTitle
        title="Import your guest data?"
        subtitle={`Cocorena found ${counts.tasks} tasks and ${counts.sessions} focus sessions saved in this browser.`}
      />
      <div className="flex flex-col gap-4 p-6">
        {error ? (
          <p role="alert" className="rounded-md bg-miss-wash px-4 py-2.5 text-sm font-medium text-miss">
            {error}
          </p>
        ) : null}
        <p className="text-sm leading-relaxed text-ink-soft">
          Importing copies them into your account so they sync across devices. Your local data is never deleted either
          way — it stays on this device as an offline copy.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button loading={busy} onClick={() => void runImport()}>
            Yes — import {counts.tasks + counts.sessions} items
          </Button>
          <Button variant="secondary" onClick={() => onDone(false)}>
            Not now — keep this device only
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------- signed-in card */

function SignedInView({ email }: { email: string }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  return (
    <Card className="p-6 text-center">
      <p className="text-sm text-ink-soft">Signed in as</p>
      <p className="mt-1 text-lg font-semibold text-forest">{email}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button onClick={() => router.push("/")}>
          <Wand2 size={15} aria-hidden /> Go to dashboard
        </Button>
        <Link href="/profile" className="inline-flex">
          <Button variant="secondary">Public profile →</Button>
        </Link>
        <Button
          variant="ghost"
          onClick={async () => {
            if (supabase) await supabase.auth.signOut();
          }}
        >
          Sign out
        </Button>
      </div>
    </Card>
  );
}

function CardTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-line px-6 py-4">
      <p className="font-display text-lg font-medium text-forest">{title}</p>
      <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>
    </div>
  );
}

function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      {error ? (
        <p role="alert" className="rounded-md bg-miss-wash px-4 py-2.5 text-sm font-medium text-miss">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="flex items-start gap-2 rounded-md bg-palm-wash px-4 py-2.5 text-sm font-medium text-forest">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden /> {notice}
        </p>
      ) : null}
    </>
  );
}

function friendly(message: string): string {
  if (message.includes("Invalid login credentials")) return "Email or password is incorrect.";
  if (message.toLowerCase().includes("already registered")) return "That email already has an account — try signing in.";
  if (message.toLowerCase().includes("rate limit")) return "Too many attempts — wait a moment and try again.";
  if (message.toLowerCase().includes("email not confirmed")) return "Confirm your email first — check your inbox (and spam).";
  return message;
}
