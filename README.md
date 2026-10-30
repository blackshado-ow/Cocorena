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
| Tests      | [Vitest](https://vitest.dev) (37 unit tests) |
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
npm.cmd test          # Vitest unit tests (37 tests)
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

## Supabase setup (optional, for sync + groups + auth)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the *Project URL* and the *anon public* key into `.env.local`.
3. Open the **SQL Editor** in the Supabase dashboard, paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it. This creates the tables (`profiles`, `tasks`, `focus_sessions`, `groups`, `group_members`, `group_sessions`), row-level-security policies, the join-code RPC, and the 12-member cap trigger.
4. In **Database → Replication → `supabase_realtime`**, add these tables to the realtime publication so live group rooms update: `groups`, `group_members`, `group_sessions`, `focus_sessions`. (The SQL file's footer contains ready-made `alter publication` statements you can paste into the SQL editor if the dashboard UI doesn't list them.)
5. **Auth settings:** for email/password sign-in nothing extra is needed. To enable email confirmation for sign-ups and **magic links**, add your app URL under *Authentication → URL Configuration* (e.g. `http://localhost:3000` during development). The magic-link flow redirects through `/auth/callback`, which is already implemented.
6. Restart the dev server. `isCloudConfigured()` becomes true and sign-in/groups activate.

### Applying future migrations

There is one migration today (`0001_init.sql`). To apply it via CLI instead of the dashboard:

```powershell
npx.cmd supabase link --project-ref YOUR_PROJECT_REF   # from Project Settings → General
npx.cmd supabase db push
```

(The dashboard SQL-editor route above is simpler and needs no CLI login.)

## Deployment

The project is standard Next.js and deploys to [Vercel](https://vercel.com) without configuration:

1. Push the repository to GitHub.
2. Import it at vercel.com → add the two `NEXT_PUBLIC_SUPABASE_*` environment variables (same values as your `.env.local`).
3. In Supabase *Authentication → URL Configuration*, add your production URL as a redirect target.

Deployment has **not** been performed for this project — the steps above are the standard path, not a claim.

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

**Cloud features (require Supabase setup):** email/password + magic-link auth, automatic one-time import of guest data into the account (idempotent — no duplicates), cross-device sync, real study groups with live presence, per-member and group focus totals, shared synchronized sessions, join-by-code with server-side validation, and a hard 12-member cap enforced by a database trigger.

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
                        /garden, /groups, /groups/[id], /focus-corner,
                        /settings, /auth, /auth/callback
  components/           feature components by domain (timers, tasks, garden,
                        groups, focuscorner, settings, auth, shell, ui, palm)
  lib/
    store.ts            guest data layer (localStorage + React hooks)
    timers/engine.ts    pure, timestamp-based timer math
    streaks.ts          day totals, streak derivation, calendar status
    dates.ts            timezone-safe day keys and calendar math
    session-record.ts   the single place sessions become statistics
    merge.ts            pure guest→account import rules (no duplicates)
    supabase/           browser client, auth state, cloud sync/mirroring
    content/tips.ts     Focus Corner content
tests/                  Vitest suites (engine, dates, streaks, tasks, merge, store)
proxy.ts                Next 16 proxy; refreshes Supabase session when configured (no-op otherwise)
supabase/migrations/    SQL schema with RLS policies
```

## Verification status (truthful)

**Verified locally:** TypeScript strict typecheck, ESLint (0 errors), all 37 unit tests, production build (15 routes), and manual browser checks of the guest-mode flows.

**Not verified (requires credentials the project intentionally doesn't contain):** live Supabase authentication, database writes, realtime group sync, and email confirmation/magic-link delivery. The integration code, SQL migration, and fallback paths are written and reviewed, but they cannot be exercised without a real Supabase project. Follow the setup section above — the code will either work as written or surface a clear error message.

## Known limitations

- Guest data lives in one browser's `localStorage`: clearing browser data erases it (Settings → "Clear all Cocorena data" is a deliberate, confirmed action). No server backup exists in guest mode.
- The local study-group demo can't show other people — that genuinely requires cloud auth; the UI says so rather than faking members.
- On Windows, PowerShell execution policy may block `npm`/`npx` shims; use `npm.cmd`/`npx.cmd` (documented above).
- The project lives inside a OneDrive-synced folder; heavy `node_modules` churn can trigger sync traffic. Excluding it from OneDrive sync is reasonable.
- Git may print LF→CRLF warnings on Windows when files change; this is cosmetic and doesn't affect the project.
- Focus Corner offers educational suggestions, not medical or psychological advice.
