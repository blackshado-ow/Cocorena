-- Cocorena initial schema (Supabase / PostgreSQL).
-- Apply with the Supabase SQL editor (paste + run) or `supabase db push`.
-- Not yet verified against a live project — see README.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  timezone text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- tasks
create table if not exists public.tasks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  notes text check (notes is null or char_length(notes) <= 500),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);
create index if not exists tasks_user_idx on public.tasks (user_id, completed);

-- ---------------------------------------------------------------- focus sessions
create table if not exists public.focus_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('pomodoro_focus', 'pomodoro_break', 'stopwatch_focus', 'manual_focus')),
  status text not null check (status in ('completed', 'abandoned')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  active_ms bigint not null check (active_ms >= 0),
  task_id uuid,
  group_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists focus_sessions_user_idx on public.focus_sessions (user_id, ended_at desc);
create index if not exists focus_sessions_group_idx on public.focus_sessions (group_id, ended_at desc);

-- ---------------------------------------------------------------- groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  owner_id uuid not null references auth.users (id) on delete cascade,
  join_code text not null unique default upper(replace(gen_random_uuid()::text, '-', '')[1..8]),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- 12-member cap, enforced even against malicious clients.
create or replace function public.enforce_group_cap() returns trigger as $$
declare
  member_count int;
begin
  select count(*) into member_count from public.group_members where group_id = new.group_id;
  if member_count >= 12 then
    raise exception 'Group is already at the 12 member limit';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists group_cap_trigger on public.group_members;
create trigger group_cap_trigger
  before insert on public.group_members
  for each row execute function public.enforce_group_cap();

-- ---------------------------------------------------------------- shared group sessions
create table if not exists public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  duration_minutes int not null default 25 check (duration_minutes between 1 and 180),
  created_at timestamptz not null default now()
);
create index if not exists group_sessions_group_idx on public.group_sessions (group_id, started_at desc);

-- ---------------------------------------------------------------- helper: group membership
create or replace function public.is_group_member(g_id uuid) returns boolean as $$
  select exists (
    select 1 from public.group_members
    where group_id = g_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

-- ---------------------------------------------------------------- join by code (server-validated)
create or replace function public.join_group_by_code(p_code text) returns uuid as $$
declare
  v_group public.groups;
  v_user uuid := auth.uid();
  v_count int;
begin
  select g.* into v_group from public.groups g
    where upper(trim(p_code)) = g.join_code limit 1;
  if not found then
    raise exception 'Invalid join code';
  end if;
  if exists (select 1 from public.group_members where group_id = v_group.id and user_id = v_user) then
    return v_group.id; -- already a member
  end if;
  select count(*) into v_count from public.group_members where group_id = v_group.id;
  if v_count >= 12 then
    raise exception 'Group is already at the 12 member limit';
  end if;
  insert into public.group_members (group_id, user_id, role) values (v_group.id, v_user, 'member');
  return v_group.id;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_sessions enable row level security;

-- Profiles: own row only.
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile upsert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Tasks: strictly own rows.
create policy "own tasks select" on public.tasks for select using (auth.uid() = user_id);
create policy "own tasks insert" on public.tasks for insert with check (auth.uid() = user_id);
create policy "own tasks update" on public.tasks for update using (auth.uid() = user_id);
create policy "own tasks delete" on public.tasks for delete using (auth.uid() = user_id);

-- Focus sessions: strictly own rows (members read only rows tagged to their
-- shared group — enforced below in seg. group visibility).
create policy "own sessions select" on public.focus_sessions for select
  using (auth.uid() = user_id or (group_id is not null and public.is_group_member(group_id)));
create policy "own sessions insert" on public.focus_sessions for insert with check (auth.uid() = user_id);
create policy "own sessions update" on public.focus_sessions for update using (auth.uid() = user_id);
create policy "own sessions delete" on public.focus_sessions for delete using (auth.uid() = user_id);

-- Groups: anyone authenticated can create; members/owner read.
create policy "create group" on public.groups for insert with check (auth.uid() = owner_id);
create policy "read group" on public.groups for select
  using (auth.uid() = owner_id or public.is_group_member(id));
create policy "owner updates group" on public.groups for update using (auth.uid() = owner_id);
create policy "owner deletes group" on public.groups for delete using (auth.uid() = owner_id);

-- Memberships: members see the roster. Self-joins are allowed (the join-by-code
-- RPC validates capacity/validity server-side; the trigger caps at 12 anyway).
create policy "read roster" on public.group_members for select
  using (auth.uid() = user_id or public.is_group_member(group_id));
create policy "self join" on public.group_members for insert with check (auth.uid() = user_id);
create policy "owner removes member" on public.group_members for delete using
  (auth.uid() = user_id or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy "owner sets roles" on public.group_members for update using
  (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

-- Shared sessions: members read the latest; creators insert.
create policy "read group session" on public.group_sessions for select using (public.is_group_member(group_id));
create policy "create group session" on public.group_sessions for insert with check
  (auth.uid() = created_by and public.is_group_member(group_id));

-- ---------------------------------------------------------------- realtime
-- Requires a schema change publication (owner does this in the dashboard:
-- Replication → supabase_realtime → add these tables, or paste below if allowed):
-- alter publication supabase_realtime add table public.group_members;
-- alter publication supabase_realtime add table public.group_sessions;
-- alter publication supabase_realtime add table public.focus_sessions;
-- alter publication supabase_realtime add table public.groups;
