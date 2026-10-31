"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff, Database, HeartHandshake, Info, UserRound } from "lucide-react";
import Link from "next/link";
import { Badge, Button, Card, CardHeader, Dialog, Field, Spinner, TextInput, Toggle } from "@/components/ui/primitives";
import { DEFAULT_SETTINGS, guestStore, useFavorites, useSettings } from "@/lib/store";
import { clearAllCocorenaData } from "@/lib/storage";
import { ensureNotificationPermission } from "@/lib/feedback";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCloudUser } from "@/lib/supabase/auth-state";
import { importGuestDataToCloud } from "@/lib/supabase/sync";
import { PageHeading } from "@/components/shell/PageHeading";

export function SettingsPage() {
  const settings = useSettings();
  const favorites = useFavorites();
  const { configured, loading, user } = useCloudUser();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(settings);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [tzInput, setTzInput] = useState(settings.timezone ?? "");
  const [tzError, setTzError] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [importState, setImportState] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Keep the editable form in sync with stored settings (rehydrate on change).
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function saveNumbers(e: React.FormEvent) {
    e.preventDefault();
    const focus = Number(form.focusMinutes);
    const brk = Number(form.breakMinutes);
    const goal = Number(form.dailyGoalMinutes);
    if (!Number.isFinite(focus) || focus < 5 || focus > 120) return setGoalError("Focus: 5–120 minutes");
    if (!Number.isFinite(brk) || brk < 1 || brk > 60) return setGoalError("Break: 1–60 minutes");
    if (!Number.isFinite(goal) || goal < 10 || goal > 600) return setGoalError("Daily goal: 10–600 minutes");
    setGoalError(null);
    guestStore.updateSettings({ focusMinutes: focus, breakMinutes: brk, dailyGoalMinutes: goal });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  function applyTimezone(e: React.FormEvent) {
    e.preventDefault();
    const value = tzInput.trim();
    if (value.length === 0) {
      guestStore.updateSettings({ timezone: null });
      setTzError(null);
      return;
    }
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: value });
      guestStore.updateSettings({ timezone: value });
      setTzError(null);
    } catch {
      setTzError("Not a valid IANA timezone (e.g. Asia/Kolkata).");
    }
  }

  async function runImport() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) return;
    setImporting(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const result = await importGuestDataToCloud(data.user);
      setImportState(
        result.ok
          ? `Imported ${result.tasksUploaded} tasks and ${result.sessionsUploaded} sessions into your account.`
          : `Import failed: ${result.error}`,
      );
    }
    setImporting(false);
  }

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Settings"
        eyebrow="Preferences"
        subtitle="Timers, goals, feedback, cloud account, and your guest data."
      />

      <Card>
        <CardHeader title="Timers & daily goal" subtitle="Applies everywhere, saved on this device" />
        <form className="grid gap-4 p-5 md:grid-cols-4 md:items-end" onSubmit={saveNumbers}>
          <Field label="Focus minutes" htmlFor="st-focus">
            <TextInput id="st-focus" type="number" min={5} max={120} value={form.focusMinutes} onChange={(e) => setForm({ ...form, focusMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Break minutes" htmlFor="st-break">
            <TextInput id="st-break" type="number" min={1} max={60} value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Daily goal (minutes)" htmlFor="st-goal" hint="25 is the minimum for a qualified day">
            <TextInput id="st-goal" type="number" min={10} max={600} value={form.dailyGoalMinutes} onChange={(e) => setForm({ ...form, dailyGoalMinutes: Number(e.target.value) })} />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit">Save</Button>
            {saved ? (
              <Badge tone="palm">
                <CheckCircle2 size={12} aria-hidden /> saved
              </Badge>
            ) : null}
          </div>
        </form>
        {goalError ? (
          <p role="alert" className="px-5 pb-4 text-sm font-medium text-miss">
            {goalError}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Feedback when sessions finish" />
        <div className="flex flex-col gap-3 p-5">
          <Toggle
            label="Sound chime"
            description="A soft two-note chime when a timer completes"
            checked={form.soundEnabled}
            onChange={(v) => {
              setForm({ ...form, soundEnabled: v });
              guestStore.updateSettings({ soundEnabled: v });
            }}
          />
          <Toggle
            label="Notifications"
            description="Browser notification on completion (permission may be requested)"
            checked={form.notificationsEnabled}
            onChange={async (v) => {
              if (v) await ensureNotificationPermission();
              setForm({ ...form, notificationsEnabled: v });
              guestStore.updateSettings({ notificationsEnabled: v });
            }}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Daily boundaries & timezone" subtitle={`Device timezone: ${deviceTz}`} />
        <form className="flex flex-col gap-3 p-5" onSubmit={applyTimezone}>
          <Field
            label="Timezone override (optional)"
            htmlFor="st-tz"
            hint={settings.timezone ? `Days currently use: ${settings.timezone}` : "Days use your device's local calendar"}
            error={tzError ?? undefined}
          >
            <TextInput id="st-tz" value={tzInput} placeholder="Asia/Kolkata" onChange={(e) => setTzInput(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary">Apply timezone</Button>
            {settings.timezone ? (
              <Button type="button" variant="ghost" onClick={() => { setTzInput(""); guestStore.updateSettings({ timezone: null }); setTzError(null); }}>
                Use the device timezone
              </Button>
            ) : null}
          </div>
          <p className="flex items-center gap-2 text-xs text-ink-soft">
            <Info size={13} aria-hidden /> Streak days follow the local calendar you choose here. Guests always get their device local day
            unless overridden.
          </p>
        </form>
      </Card>

      <Card>
        <CardHeader title="Account" subtitle={configured ? "Cloud authentication is configured" : "Cloud is not configured — guest mode is fully functional"} />
        <div className="flex flex-col gap-4 p-5">
          {loading && configured ? (
            <Spinner label="Checking your session" />
          ) : !configured ? (
            <div className="flex items-start gap-3">
              <CloudOff size={18} className="mt-0.5 shrink-0 text-brown" aria-hidden />
              <div className="text-sm text-ink-soft">
                <p>
                  To enable sign-in, groups, and cloud syncing: create a free Supabase project, copy its URL and anon key, and paste them
                  into <code className="rounded bg-brown-wash px-1 font-mono">.env.local</code> as{" "}
                  <code className="rounded bg-brown-wash px-1 font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                  <code className="rounded bg-brown-wash px-1 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then run the SQL migration
                  from the README. Everything on this site already works without it.
                </p>
              </div>
            </div>
          ) : user ? (
            <>
              <p className="text-sm text-ink-soft">
                Signed in as <strong className="text-forest">{user.email}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" loading={importing} onClick={runImport}>
                  <HeartHandshake size={15} aria-hidden /> Import guest data into this account
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const supabase = getSupabaseBrowserClient();
                    if (supabase) await supabase.auth.signOut();
                  }}
                >
                  Sign out
                </Button>
                <Link href="/profile" className="inline-flex">
                  <Button variant="ghost">
                    <UserRound size={15} aria-hidden /> Public profile →
                  </Button>
                </Link>
              </div>
              {importState ? <p className="text-sm text-ink-soft" role="status">{importState}</p> : null}
            </>
          ) : (
            <p className="text-sm text-ink-soft">
              You&apos;re in guest mode. Signing in protects your streak and enables groups —{" "}
              <a href="/auth" className="font-medium text-palm hover:underline">
                go to sign in →
              </a>
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Your guest data" subtitle="Stored in this browser only" />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <Badge tone="neutral"><Database size={11} aria-hidden /> {favorites.length} favorite tips</Badge>
          <Button variant="danger" size="sm" onClick={() => setClearOpen(true)}>
            Clear all Cocorena data
          </Button>
        </div>
      </Card>

      <Dialog open={clearOpen} onClose={() => setClearOpen(false)} title="Erase everything?">
        <p className="text-sm text-ink-soft">
          Tasks, sessions, streak history, favorites, timer states, and settings will be permanently deleted from this browser. Cloud data (
          if you&apos;re signed in) is unaffected.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setClearOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              clearAllCocorenaData();
              guestStore.clearAllData();
              setForm(DEFAULT_SETTINGS);
              setClearOpen(false);
            }}
          >
            Delete everything
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
