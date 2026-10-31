"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Spinner,
  TextInput,
} from "@/components/ui/primitives";
import { PageHeading } from "@/components/shell/PageHeading";
import { useCloudUser } from "@/lib/supabase/auth-state";
import {
  claimUsername,
  fetchOwnProfile,
  updateProfile,
  type ProfileRow,
} from "@/lib/supabase/profile";
import { profileInitials } from "@/lib/social-utils";

export function ProfilePage() {
  const { configured, loading, user } = useCloudUser();

  if (!configured) return <ProfileIntro error={<CloudDown />} />;
  if (loading) return <div className="py-10"><Spinner label="Checking sign-in" /></div>;
  if (!user) return <ProfileIntro error={<SignInNeeded />} />;

  return <ProfileEditor />;
}

function ProfileIntro({ error }: { error: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Your profile"
        eyebrow="Account"
        subtitle="Your public card: the name, username, and face other students see."
      />
      {error}
    </div>
  );
}

function CloudDown() {
  return (
    <Card className="flex items-start gap-3 p-5">
      <p className="text-sm text-ink-soft">
        <strong className="text-forest">Cloud not configured.</strong> Profiles need Supabase credentials (README →
        Supabase setup). Everything else keeps working in guest mode.
      </p>
    </Card>
  );
}

function SignInNeeded() {
  return (
    <Card className="p-6">
      <p className="text-sm leading-relaxed text-ink-soft">
        A profile exists for signed-in accounts only. Guests are private by design — nothing leaves this browser.{" "}
        <a href="/auth" className="font-medium text-palm-deep hover:underline">
          Go to sign in →
        </a>
      </p>
    </Card>
  );
}

function ProfileEditor() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetchOwnProfile();
      if ("profile" in res) setProfile(res.profile);
      else setLoadError(res.error);
    })();
  }, []);

  if (loadError) {
    return <Card className="p-5"><p className="text-sm text-miss" role="alert">{loadError}</p></Card>;
  }
  if (!profile) {
    return <div className="py-10"><Spinner label="Fetching your profile" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Your profile"
        eyebrow="Account"
        subtitle="Your public card: the name, username, and avatar other students see. Email stays private — it is never part of your public profile."
      />

      <PublicCard profile={profile} />

      {profile.username === null ? (
        <ClaimUsernameCard
          onClaimed={(next) => {
            setProfile(next);
            flash("Username claimed.");
          }}
        />
      ) : (
        <Card>
          <CardHeader title="Public details" subtitle="You pick what studying companions see." />
          <PublicFields
            profile={profile}
            onSaved={(next) => {
              setProfile(next);
              flash("Profile saved.");
            }}
          />
        </Card>
      )}

      {saved ? (
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-medium text-palm-deep">
          <Check size={14} aria-hidden /> {saved}
        </p>
      ) : null}
    </div>
  );

  function flash(text: string) {
    setSaved(text);
    window.setTimeout(() => setSaved(null), 2500);
  }
}

function PublicCard({ profile }: { profile: ProfileRow }) {
  const label = profile.display_name?.trim() || profile.username || "student";
  const [copied, setCopied] = useState(false);
  const initials = useMemo(() => profileInitials(label), [label]);

  return (
    <Card className="flex flex-wrap items-center justify-between gap-5 p-6">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full border border-line object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-palm-wash font-display text-lg font-medium text-palm-deep" aria-hidden>
            {initials}
          </span>
        )}
        <div>
          <p className="font-display text-2xl font-medium text-forest">{label}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {profile.username ? `@${profile.username}` : "No username yet"}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <p className="eyebrow text-ink-soft">Your friend code</p>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-line bg-cream/70 px-3 py-1.5 font-mono text-lg font-semibold tracking-widest text-forest">
            {profile.friend_code}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(profile.friend_code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-ink-soft">Friends can find you with this code — or with your username.</p>
      </div>
    </Card>
  );
}

function ClaimUsernameCard({ onClaimed }: { onClaimed: (profile: ProfileRow) => void }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableHint = useMemo(() => {
    const cleaned = username.trim().toLowerCase();
    if (cleaned.length === 0) return "3–24 characters: lowercase letters, numbers, underscores.";
    if (!/^[a-z0-9_]{3,24}$/.test(cleaned)) return "Only lowercase letters, numbers, and underscores (3–24 chars).";
    return "Looks valid — check it.";
  }, [username]);

  return (
    <Card>
      <CardHeader title="Claim your username" subtitle="One per account — how friends find you besides the code." />
      <form
        className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          const res = await claimUsername(username);
          setBusy(false);
          if ("profile" in res) onClaimed(res.profile);
          else setError(res.error);
        }}
      >
        <Field label="Username" htmlFor="claim-username" hint={availableHint} error={error ?? undefined}>
          <TextInput
            id="claim-username"
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
        <Button type="submit" loading={busy} disabled={busy}>
          Claim username
        </Button>
      </form>
    </Card>
  );
}

function PublicFields({ profile, onSaved }: { profile: ProfileRow; onSaved: (profile: ProfileRow) => void }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(null);
        const res = await updateProfile({
          display_name: displayName || null,
          avatar_url: avatarUrl || null,
        });
        setBusy(false);
        if ("profile" in res) onSaved(res.profile);
        else setError(res.error);
      }}
    >
      <Field label="Display name" htmlFor="pn" hint="Optional — usernames are always shown as @name too." error={error ?? undefined}>
        <TextInput
          id="pn"
          value={displayName}
          maxLength={60}
          placeholder="e.g. Ada"
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>
      <Field label="Avatar URL (optional)" htmlFor="pn-avatar" hint="A small image, e.g. a square image URL. Leave blank for initials.">
        <TextInput
          id="pn-avatar"
          value={avatarUrl}
          maxLength={400}
          type="url"
          placeholder="https://…"
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={busy} disabled={busy}>
          Save profile
        </Button>
        <Badge tone="neutral">epoch {new Date(profile.created_at).toLocaleDateString()}</Badge>
      </div>
    </form>
  );
}
