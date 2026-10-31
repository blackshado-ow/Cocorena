# 🥥 Cocorena — your tropical study companion

Cocorena is a gamified productivity and study website. Run Pomodoro focus sessions, time long study blocks with a stopwatch, race small tasks with countdowns, keep a priority to-do list, grow a coconut-tree streak garden, study with friends in groups, and browse practical study advice in the Focus Corner.

**Guest mode is first-class**: the entire core experience works with zero accounts and zero cloud configuration — your data lives in your browser. Sign in (optional) syncs streaks, tasks, and study groups across devices.

---

## Technology stack

| Layer      | Choice |
|------------|--------|
| Framework  | [Next.js](https://nextjs.org) 16 (App Router, TypeScript strict, Turbopack) |
| Styling    | [Tailwind CSS](https://tailwindcss.com) 4 (design tokens in `src/app/globals.css`) |
| Icons      | [lucide-react](https://lucide.dev) |
| Cloud      | [Supabase](https://supabase.com) — Postgres + Auth + Realtime (optional; anon key only, never the service-role key) |
| Tests      | [Vitest](https://vitest.dev) (56 unit tests) |
| Guest data | Browser `localStorage` via a central store (`src/lib/store.ts`) |

## Prerequisites

- **Node.js 20+** — download from [nodejs.org](https://nodejs.org).
- Windows users: if PowerShell blocks `npm` with an execution-policy error, use `npm.cmd` instead (see below).

## Installation

```powershell
# inside the project folder
npm.cmd install
```

> **Windows PowerShell tip:** if plain `npm` fails with *"running scripts is disabled on this system"*, every command in this README still works if you type `npm.cmd` instead of `npm` (and `npx.cmd` instead of `npx`). That skips the PowerShell shim entirely. No settings need to change.

## Run the development server

```powershell
npm.cmd run dev
```

Open **http://localhost:3000**. The site starts in guest mode immediately — no setup required.

## Run tests, checks, and a production build

```powershell
npm.cmd test          # Vitest unit tests (56 tests)
npm.cmd run lint      # ESLint
npx.cmd tsc --noEmit  # TypeScript strict check
npm.cmd run build     # production build
npm.cmd start         # serve the production build
```

All four checks pass as of the current code (see *Verification status* below).

## Environment variables

Copy `.env.example` to a new file named `.env.local` and fill in values **only if** you want cloud features:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- `.env.local` is gitignored — never commit real credentials.
- Leaving both values empty keeps Cocorena in pure guest mode, which is fully functional.
- Only the **anon/public** key belongs here. Never put the Supabase service-role key in client code.

## Supabase setup (required for accounts, friends, and shared groups)

Cocorena is fully usable in guest mode without any of this. To enable sign-in, profiles, friends, and real multi-user study groups:

1. **Create the project.** Sign up free at [supabase.com](https://supabase.com) and create a project (free tier is enough).
2. **Copy the public credentials.** In *Project Settings → API*, copy the **Project URL** and the **anon/public key** into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are the only two variables the app reads — the service-role key must never be placed in client-side code.
3. **Apply the migrations, in order.** Open the **SQL Editor** in the Supabase dashboard and run:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — base tables (`profiles` handled by 0002, `tasks`, `focus_sessions`, `groups`, `group_members`, `group_sessions`), row-level-security policies, and the join-code RPC.
   - [`supabase/migrations/0002_accounts_friends_groups.sql`](supabase/migrations/0002_accounts_friends_groups.sql) — the social layer: usernames + friend codes (auto-generated at signup via the `handle_new_user` trigger), public-profile search functions, `friend_requests` lifecycle with guards, group descriptions/invitation toggles, `regenerate_group_join_code`, `join_group_by_code` (validates code, paused invitations, and the 12-member cap), the owner-leave guard, and privacy hardening (dropping `profiles.email`; `focus_sessions` readable by its owner only).

   CLI alternative (applies both automatically):
   ```powershell
   npx.cmd supabase link --project-ref YOUR_PROJECT_REF   # from Project Settings → General
   npx.cmd supabase db push
   ```
4. **Configure auth URLs.** In *Authentication → URL Configuration*:
   - **Site URL:** your deployed URL (e.g. `https://cocorena.vercel.app`); `http://localhost:3000` while developing.
   - **Redirect URLs:** add `<SITE_URL>/auth/callback` for both environments. Password-reset emails additionally redirect through `/auth/callback?next=/auth?reset=1`, which lands on the sign-in page in set-new-password mode.
   - If you enable **email confirmation** for sign-ups, keep in mind production messages will be rate-limited on Supabase's built-in sender (~2 per hour). For real users configure custom **SMTP** (*Project Settings → Authentication → SMTP Settings*) — Supabase's docs cover provider setup.
5. **Enable realtime for group rooms.** In *Database → Replication → `supabase_realtime`*, add the tables `groups`, `group_members`, and `group_sessions` (dashboard UI; or paste the commented-out `alter publication` statements at the bottom of `0002_accounts_friends_groups.sql` into the SQL editor). Realtime room presence reads broadcasts (no publication change needed for presence), but shared-session inserts and member-roster changes come from these table events. Without this the room still works — it falls back to 30-second polling.
6. **Restart the dev server** (or redeploy). `isCloudConfigured()` becomes true and the sign-in, profile, friends, and group pages activate.

### Definition-of-done manual test script (with a real project)

1. Open two separate browser profiles (A and B). In each, sign up from `/auth` and claim a username when prompted (`user-a`, `user-b`).
2. On B's `/profile` page, copy the friend code. On A's `/friends` page, search B by username and by that code — both should find exactly one profile.
3. A sends a request; B sees it under *Incoming requests*, accepts; both see B under *Friends*. A removal on either side removes it from both.
4. Try re-sending a request to an existing friend, and to yourself — both are rejected with a friendly error.
5. In profile A's account, create a group from `/groups`; open the room; copy the share link. Paste it in browser B (signed in): `/groups/join?code=…` joins and opens the room. Both browsers show the same member list, join code, and shared-session countdown.
6. In the room, owner A: *Pause invitations* → B-2 (a second fresh account) joining by the old code gets "Invitations are paused"; owner *opens invitations again* (or *New join code*) and joining works. Owner *removes* a member; members non-owner only see *Leave group*.
7. Start a shared 25-min session; the countdown in both browsers advances from the same start timestamp. With browser A's timer running, A's status shows "focusing now" and their today-minutes appear in the room (requires step 5 realtime publication; otherwise the roster still refetches every 30s).
8. Guest-import: with tasks recorded while signed out, sign in — the app asks before importing them; "Not now" keeps data local-only.

## Deployment to Vercel

1. Push the repository to GitHub and import it at [vercel.com](https://vercel.com).
2. Under *Settings → Environment Variables*, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`). Only these two are required; there are no server-side secrets.
3. In Supabase *Authentication → URL Configuration*, set **Site URL** to `https://cocorena.vercel.app` and add `https://cocorena.vercel.app/auth/callback` as a redirect URL.
4. Redeploy (Vercel auto-deploys on push).

**Production status:** the live site (`https://cocorena.vercel.app`) currently runs **without** Supabase credentials — it renders the guest-mode experience and the "cloud accounts aren't set up yet" notice on `/auth`. Nothing above has been claimed as done until you perform steps 1–3.

---

## Features

**Guest mode (no Supabase needed):**

| Feature | Notes |
|---|---|
| Dashboard | Real statistics derived from your recorded sessions/tasks — greeting, today's focus time vs. goal, sessions today, streak, task progress, last-7-days coconuts, priority tasks, tip of the day, group summary |
| Pomodoro | Customizable focus/break minutes; a break unlocks **only after** focus completes; pause/resume (paused time never counts); ending early records an *abandoned* session that adds no focus time; refresh-safe; timestamp-based so background-tab throttling can't corrupt it; sound chime + browser notifications (opt-in) |
| Stopwatch | True elapsed time in h:m:s; pause = manual break; explicit "Finish & save" records the session; double-click-protected; reset asks for confirmation |
| Countdown | h/m/s inputs with validation and quick presets; completion detection survives throttling/refresh; countdowns are **not** counted as focus time unless you explicitly log them |
| Tasks | Add/edit/delete (with confirm), High/Medium/Low priority, due dates, notes, filters (active/overdue/completed/all), sorting, overdue highlighting, accessible controls, input limits |
| Streak Garden | One coconut per day; green = goal reached, red-crossed = missed, dashed = still open; current + longest streak + productive days; month calendar navigation; the rules are spelled out in the UI; no shaming |
| Study groups (local demo) | Create a group, get a join code, open a room — **honestly labeled local-only**; other devices/sync require cloud setup |
| Focus Corner | 20 curated tips across 7 categories, search + category filter + favorites, no AI/API dependencies |
| Settings | Durations, daily goal, sound/notifications, timezone override, guest-data import/export, clear-all-data with confirmation |

**Cloud features (require Supabase setup):** email/password + magic-link auth with password reset; a public profile card (username, optional display name and avatar, auto-generated friend code — the email address is never part of it and lives only in Supabase Auth); finding people by exact username or friend code; the full friend-request lifecycle (send / accept / reject / cancel / remove) with server-side guards against duplicates, self-requests, and forged actions; real multi-user study groups (create with description, join by code or share link, pause/regenerate invitations, remove members, leave, delete or transfer ownership); live room presence (coarse status + today's focus minutes — never task lists or full session history), shared synchronized countdown sessions, and a 30-second polling fallback when realtime is unavailable; explicit, confirmed one-time import of guest data into the account.

## Design language (editorial botanical)

The interface follows an "editorial botanical" direction — more quiet study journal than app dashboard:

- **Type:** Fraunces (display serif) for headings and big numerals (`--font-display`, `font-display` utility); Geist for body text; `eyebrow` utility for small spaced-uppercase labels.
- **Palette:** one set of tokens in `src/app/globals.css` (`--color-*`) — warm ivory paper (`cream`/`surface`), deep forest ink (`forest`/`palm`), sage (`palm-wash`), earth (`brown`, `terracotta`, `gold`), and hairline rules (`line`).
- **Space:** one dark forest panel per page at most (dashboard focus entry); indicators are hairline-ruled typographic bands instead of boxed stat cards; cards use thin borders and soft shadows with a 12-column working canvas (`max-w-6xl`).
- **Botanical art:** all coconut/palm/sprig illustration is inline SVG in `src/components/palm/PalmArt.tsx` — no image assets, status colors map to the same tokens.
- **Motion:** only the small `rise`/`fade` transitions defined in globals.css; everything is disabled under `prefers-reduced-motion`.

### Data rules (the honest-math guarantees)

- A **qualifying day** = at least 25 focused minutes (or your configured daily goal, minimum 25), measured as *unpaused, completed focus time*.
- Breaks, abandoned sessions, and sub-second blips never count toward focus time.
- Streaks are **derived** from recorded sessions on every load — never incremented blindly.
- Time is attributed to the local day a session **ended** on (your device's timezone, or your configured IANA override).
- Sessions are recorded under a stable id: a duplicated completion event updates one row instead of creating two.

## Project structure (orientation guide)

```
src/
  app/                  routes: /, /focus, /stopwatch, /countdown, /tasks,
                        /garden, /groups, /groups/[id], /groups/join,
                        /friends, /profile, /focus-corner, /settings,
                        /auth, /auth/callback
  components/           feature components by domain (auth, friends, groups,
                        profile, timers, tasks, garden, focuscorner,
                        settings, shell, ui, palm)
  lib/
    store.ts            guest data layer (localStorage + React hooks)
    timers/engine.ts    pure, timestamp-based timer math
    streaks.ts          day totals, streak derivation, calendar status
    dates.ts            timezone-safe day keys and calendar math
    session-record.ts   the single place sessions become statistics
    merge.ts            pure guest→account import rules (no duplicates)
    social-utils.ts     pure social helpers (username/code validation,
                        presence payloads) — unit-tested
    redirect.ts         safe redirect-target validation for auth callbacks
    supabase/           browser client, auth state, profiles, friends,
                        groups, cloud sync/mirroring
    content/tips.ts     Focus Corner content
tests/                  Vitest suites (engine, dates, streaks, tasks, merge,
                        store + src/ social-utils, redirect suites)
proxy.ts                Next 16 proxy; refreshes Supabase session when configured (no-op otherwise)
supabase/migrations/    SQL schema with RLS policies (0001 base, 0002 social)
```

## Verification status (truthful)

**Verified locally:** TypeScript strict typecheck (0 errors), ESLint (0 errors, 0 warnings), all **56 unit tests** across 8 suite files (timer engine, dates, streaks, tasks, merge, store, social helpers, redirect validation), and the production build (16 routes — all static single-flush prerendered except the PPR group room and the dynamic auth callback). Manual browser checks cover guest mode and the not-configured states of the new `/friends`, `/profile`, and `/groups/join` pages.

**Not verified (requires a real Supabase project, which this repository intentionally doesn't contain):** live authentication (signup/sign-in/password-reset emails), database writes, RLS enforcement against malicious reads (policies are reviewed but not exercised), friend-request and group-invitation flows, and realtime presence delivery. The migrations, data layer, and fallbacks are written and reviewed but unexercised — follow the setup above and the Definition-of-done test script, and treat the code's error messages as the source of truth on any discrepancy.

## Known limitations

- **Cloud features are unverified end-to-end.** No Supabase project is configured in the repo or on production, so auth, friends, groups, and realtime presence have not been exercised against a live database. The SQL migrations (including the RLS policy set) are reviewed but untested; apply them and run the manual test script above before trusting them with real users.
- **Realtime delivery depends on the realtime publication** (Database → Replication). Without it, group rooms fall back to a 30-second refetch loop — statuses arrive late, but nothing breaks. Presence events (member status + today's minutes) rely on the room's presence channel and are only read while a room is open.
- **Member identity is pseudonymous by design:** the room roster never shows email addresses (which the schema doesn't even have); it shows display name or username. Group member counts and friend search are capped (12 members, limit-5-username search) to make the system unattractive for directory mining.
- Guest data lives in one browser's `localStorage`: clearing browser data erases it (Settings → "Clear all Cocorena data" is a deliberate, confirmed action). No server backup exists in guest mode.
- Guest→account import is **explicit**: after sign-in the app shows a confirmation with exact counts (and Settings has the same action). Declining leaves the data local-only.
- Device values such as today's date and the greeting hour are resolved right after the page loads (never on the server), so the very first paint shows neutral placeholders for a moment and then the live values appear. This is deliberate: Cache Components requires prerendered pages to be free of device-only data, and it keeps every route a fast, complete HTML flush.
- The local study-group demo can't show other people — that genuinely requires cloud auth; the UI says so rather than faking members.
- On Windows, PowerShell execution policy may block `npm`/`npx` shims; use `npm.cmd`/`npx.cmd` (documented above).
- The project lives inside a OneDrive-synced folder; heavy `node_modules` churn can trigger sync traffic. Excluding it from OneDrive sync is reasonable.
- Git may print LF→CRLF warnings on Windows when files change; this is cosmetic and doesn't affect the project.
- Focus Corner offers educational suggestions, not medical or psychological advice.
