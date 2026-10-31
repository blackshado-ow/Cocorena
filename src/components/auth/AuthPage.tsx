"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CloudOff, Mail, Wand2 } from "lucide-react";
import { Badge, Button, Card, Field, Segmented, TextInput } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCloudUser } from "@/lib/supabase/auth-state";
import { importGuestDataToCloud } from "@/lib/supabase/sync";
import { PageHeading } from "@/components/shell/PageHeading";

export function AuthPage() {
  const { configured, loading, user } = useCloudUser();

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
                <li>Run the SQL in supabase/migrations/0001_init.sql in the Supabase SQL editor (README has every step).</li>
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

  if (user) {
    return <SignedIn email={user.email ?? "your account"} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Sign in"
        eyebrow="Cloud sync"
        subtitle="Guest mode stays available; signing in syncs your streak and groups across devices."
      />
      {loading ? (
        <Card className="p-6 text-sm text-ink-soft">Checking your session…</Card>
      ) : (
        <AuthForms />
      )}
    </div>
  );
}

function AuthForms() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (mode === "signup" && password !== confirm) {
      setError("Passwords don't match.");
      return false;
    }
    return true;
  }

  async function afterAuth() {
    setNotice("Signed in. Importing your guest data…");
    setError(null);
    try {
      const { data } = await supabase!.auth.getUser();
      if (data.user) {
        const result = await importGuestDataToCloud(data.user);
        router.push("/");
        if (!result.ok) {
          // Landing still proceeds; the account itself works.
        }
      } else {
        router.push("/");
      }
    } catch {
      router.push("/");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    if (!validate()) return;
    setBusy(true);
    setError(null);
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(friendly(err.message));
      else await afterAuth();
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) setError(friendly(err.message));
      else {
        setNotice("Account created. If email confirmation is enabled in your Supabase project, check your inbox; otherwise you're being signed in…");
        const { data: session } = await supabase.auth.getUser();
        if (session?.user) await afterAuth();
      }
    }
    setBusy(false);
  }

  async function magicLink(e: React.FormEvent) {
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

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <Segmented
          ariaLabel="Choose account mode"
          value={mode}
          onChange={(m) => {
            setMode(m);
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
            <TextInput id="auth-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!error} />
          </Field>
          {mode === "signup" ? (
            <Field label="Confirm password" htmlFor="auth-confirm">
              <TextInput id="auth-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!error} />
            </Field>
          ) : null}

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

          <Button type="submit" loading={busy} size="lg">
            {mode === "signin" ? "Sign in" : "Create account"}
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

      <Card className="p-5">
        <p className="flex items-center gap-2 text-xs text-ink-soft">
          <Wand2 size={13} aria-hidden />
          Guest data can be imported into the account right after signing in — nothing is lost. Passwords are handled entirely by Supabase
          Auth and never touch app storage.{" "}
          <Link href="/settings" className="font-medium text-palm hover:underline">
            Settings has the import action →
          </Link>
        </p>
      </Card>

      <p className="text-center text-xs text-ink-soft">
        <Badge tone="neutral">guest mode</Badge> you can always skip signing in
      </p>
    </div>
  );
}

function SignedIn({ email }: { email: string }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  return (
    <Card className="p-6 text-center">
      <p className="text-sm text-ink-soft">Signed in as</p>
      <p className="mt-1 text-lg font-semibold text-forest">{email}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button onClick={() => router.push("/")}>
          <Wand2 size={15} aria-hidden /> Go to dashboard
        </Button>
        <Button
          variant="secondary"
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

function friendly(message: string): string {
  if (message.includes("Invalid login credentials")) return "Email or password is incorrect.";
  if (message.toLowerCase().includes("already registered")) return "That email already has an account — try signing in.";
  if (message.toLowerCase().includes("rate limit")) return "Too many attempts — wait a moment and try again.";
  return message;
}
