"use client";

import { useEffect, useState } from "react";
import LinkNext from "next/link";
import { Check, Search, UserMinus, UserPlus, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Segmented,
  Spinner,
  TextInput,
} from "@/components/ui/primitives";
import { PageHeading } from "@/components/shell/PageHeading";
import { useCloudUser } from "@/lib/supabase/auth-state";
import {
  acceptFriendRequest,
  friendLabel,
  loadSocialState,
  removeRequestOrFriendship,
  searchByExactUsername,
  searchByFriendCode,
  sendFriendRequest,
  type Friend,
  type SearchResult,
} from "@/lib/supabase/social";
import type { PublicProfile } from "@/lib/social-utils";
import { profileInitials } from "@/lib/social-utils";
import { useMounted } from "@/hooks/use-mounted";

type SearchMode = "username" | "code";

export function FriendsPage() {
  const { configured, loading, user } = useCloudUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [stateError, setStateError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const mounted = useMounted();

  async function refresh() {
    setListLoading(true);
    setStateError(null);
    const state = await loadSocialState();
    setFriends(state.friends);
    setStateError(state.error);
    setListLoading(false);
  }

  useEffect(() => {
    if (mounted && user) void refresh();
    else if (mounted) setListLoading(false);
  }, [user?.id, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const heading = (
    <PageHeading
      title="Friends"
      eyebrow="People"
      sprig={false}
      subtitle="Find study partners by their username or friend code. Public profiles only — email addresses are never shown to anyone."
    />
  );

  if (!configured) {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <Card className="flex items-start gap-3 p-5">
          <p className="text-sm text-ink-soft">
            <strong className="text-forest">Cloud not configured.</strong> Friend connections need Supabase credentials
            (see the README → Supabase setup). Meanwhile the whole study app keeps working in guest mode.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="py-10"><Spinner label="Checking sign-in" /></div>;

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <Card className="p-6">
          <p className="text-sm leading-relaxed text-ink-soft">
            Friend connections need an account — guest data stays private on this device.{" "}
            <LinkNext href="/auth" className="font-medium text-palm-deep hover:underline">
              Go to sign in →
            </LinkNext>
          </p>
        </Card>
      </div>
    );
  }

  const incoming = friends.filter((f): f is Friend & { kind: "incoming" } => f.kind === "incoming");
  const outgoing = friends.filter((f): f is Friend & { kind: "outgoing" } => f.kind === "outgoing");
  const accepted = friends.filter((f): f is Friend & { kind: "friend" } => f.kind === "friend");

  async function respond(kind: "accept" | "remove" | "cancel", requestId: string): Promise<void> {
    const result =
      kind === "accept" ? await acceptFriendRequest(requestId) : await removeRequestOrFriendship(requestId);
    if (result.ok) {
      void refresh();
    } else {
      setStateError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {heading}

      <SearchUsers myId={user.id} accepted={accepted} onActionDone={refresh} />

      {stateError ? (
        <p role="alert" className="rounded-md bg-miss-wash px-4 py-2.5 text-sm font-medium text-miss">
          {stateError}
        </p>
      ) : null}

      {listLoading ? (
        <Spinner label="Opening your circle" />
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <CardHeader title="Incoming requests" action={<Badge tone="palm">{incoming.length}</Badge>} />
            <RequestList
              rows={incoming}
              empty={{ title: "No requests waiting", hint: "When someone adds you, it appears here." }}
              renderActions={(entry) => (
                <>
                  <Button size="sm" onClick={() => void respond("accept", entry.requestId)}>
                    <Check size={14} aria-hidden /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void respond("remove", entry.requestId)}>
                    <X size={14} aria-hidden /> Reject
                  </Button>
                </>
              )}
            />
          </Card>

          <Card>
            <CardHeader title="Outgoing requests" action={<Badge tone="brown">{outgoing.length}</Badge>} />
            <RequestList
              rows={outgoing}
              empty={{ title: "Nothing sent yet", hint: "Search above to invite someone." }}
              renderActions={(entry) => (
                <Button size="sm" variant="ghost" onClick={() => void respond("cancel", entry.requestId)}>
                  Cancel
                </Button>
              )}
            />
          </Card>

          <Card>
            <CardHeader title="Friends" action={<Badge tone="neutral">{accepted.length}</Badge>} />
            <FriendList
              onRemoved={() => void refresh()}
              rows={accepted}
              empty={{ title: "No friends yet", hint: "Search by username, or share your friend code from your profile." }}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- search card */

function SearchUsers({ myId, accepted, onActionDone }: {
  myId: string;
  accepted: (Friend & { kind: "friend" })[];
  onActionDone: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<SearchMode>("username");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PublicProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function aboutFriend(id: string): string | null {
    if (accepted.some((f) => f.friend.id === id)) return "You're already friends.";
    return null;
  }

  async function find() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setResult(null);
    const res: SearchResult =
      mode === "username" ? await searchByExactUsername(query, myId) : await searchByFriendCode(query, myId);
    setBusy(false);
    if (res.ok) setResult(res.profile);
    else {
      setError(res.error);
      if (res.notFound && mode === "code") setQuery(query.trim().toUpperCase());
    }
  }

  async function send(target: PublicProfile) {
    setBusy(true);
    setError(null);
    const maybe = aboutFriend(target.id);
    if (maybe) {
      setMessage(maybe);
      setBusy(false);
      return;
    }
    const res = await sendFriendRequest(target.id);
    setBusy(false);
    if (res.ok) {
      setMessage(`Request sent to ${friendLabel({ kind: "outgoing", friend: target, requestId: "" })}.`);
      setResult(null);
      setQuery("");
      void onActionDone();
    } else {
      setError(res.error);
    }
  }

  return (
    <Card>
      <CardHeader title="Find people" subtitle="Exact username or 8-character friend code — no browsing through lists." />
      <div className="flex flex-col gap-3 p-5">
        <Segmented
          ariaLabel="Search mode"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
            setMessage(null);
            setResult(null);
          }}
          options={[
            { value: "username", label: "By username" },
            { value: "code", label: "By friend code" },
          ]}
        />
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void find();
          }}
        >
          <Field label={mode === "username" ? "Username" : "Friend code"} htmlFor="friend-search">
            <TextInput
              id="friend-search"
              value={query}
              maxLength={24}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={mode === "username" ? "e.g. study_owl" : "e.g. AB2CD4F9"}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={busy} disabled={busy}>
            <Search size={16} aria-hidden /> Search
          </Button>
        </form>

        {error ? (
          <p role="alert" className="rounded-md bg-miss-wash px-4 py-2 text-sm font-medium text-miss">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="rounded-md bg-palm-wash px-4 py-2 text-sm font-medium text-palm-deep">
            {message}
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-cream/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar profile={result} size={40} />
              <div>
                <p className="text-sm font-medium text-forest">{friendLabel({ kind: "outgoing", friend: result, requestId: "" })}</p>
                <p className="text-xs text-ink-soft">@{result.username} · code {result.friend_code}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => void send(result)} disabled={busy}>
              <UserPlus size={14} aria-hidden /> Send request
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- row lists */

function RequestList<T extends Friend>({ rows, empty, renderActions }: {
  rows: T[];
  empty: { title: string; hint: string };
  renderActions: (entry: T) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return <div className="p-5"><EmptyState title={empty.title} hint={empty.hint} /></div>;
  }
  return (
    <ul className="flex flex-col p-4">
      {rows.map((entry) => (
        <li key={rowId(entry)} className="flex items-center justify-between gap-3 border-b border-line/70 px-2 py-3 last:border-b-0">
          <PersonSummary friend={entry} />
          <span className="flex shrink-0 gap-1.5">{renderActions(entry)}</span>
        </li>
      ))}
    </ul>
  );
}

function FriendList({ rows, empty, onRemoved }: {
  rows: (Friend & { kind: "friend" })[];
  empty: { title: string; hint: string };
  onRemoved: () => void;
}) {
  const [removing, setRemoving] = useState<(Friend & { kind: "friend" }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (rows.length === 0) {
    return <div className="p-5"><EmptyState title={empty.title} hint={empty.hint} /></div>;
  }

  return (
    <>
      <ul className="flex flex-col p-4">
        {rows.map((entry) => (
          <li key={entry.friend.id} className="flex items-center justify-between gap-3 border-b border-line/70 px-2 py-3 last:border-b-0">
            <PersonSummary friend={entry} />
            <Button size="sm" variant="ghost" aria-label={`Remove ${friendLabel(entry)}`} onClick={() => setRemoving(entry)}>
              <UserMinus size={15} aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title="Remove this friend?">
        {removing ? (
          <>
            <p className="text-sm text-ink-soft">
              <strong className="text-forest">{friendLabel(removing)}</strong> will no longer be in your circle. You can
              send a new request later.
            </p>
            {error ? <p className="mt-2 text-sm text-miss">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRemoving(null)}>
                Keep
              </Button>
              <Button
                variant="danger"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  const res = await removeRequestOrFriendship(removing.requestId);
                  setBusy(false);
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setRemoving(null);
                  onRemoved();
                }}
              >
                <UserMinus size={15} aria-hidden /> Remove
              </Button>
            </div>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

function rowId(entry: unknown): string {
  const e = entry as Friend;
  return e.requestId || e.friend.id;
}

function PersonSummary({ friend }: { friend: Friend }) {
  const label = friendLabel(friend);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar friend={friend} size={36} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-forest">{label}</p>
        <p className="truncate text-xs text-ink-soft">@{friend.friend.username ?? "?"}</p>
      </div>
    </div>
  );
}

function Avatar({ friend, profile, size = 36 }: { friend?: Friend; profile?: PublicProfile; size?: number }) {
  const target = friend?.friend ?? profile;
  const label = friend ? friendLabel(friend) : profileInitials(target?.username ?? "?");
  const url = target?.avatar_url;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full border border-line object-cover" />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-palm-wash font-display text-xs font-medium text-palm-deep"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {profileInitials(label)}
    </span>
  );
}
