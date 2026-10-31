-- Cocorena 0002: real multi-user social layer — public profiles, friends,
-- group invitations & controls, privacy hardening.
-- Apply AFTER 0001_init.sql (Supabase SQL editor or `supabase db push`).
-- Not verified against a live project without credentials — see README.

create extension if not exists "pgcrypto";

-- ======================================================= PROFILE HARDENING
-- Email is authentication data, not profile data: auth.users already holds it
-- securely. Drop the public-profile copy and never store it again.
alter table public.profiles drop column if exists email;

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists friend_code text;
alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format check (
    username is null or (username = lower(username) and username ~ '^[a-z0-9_]{3,24}$')
  );

alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles
  add constraint profiles_avatar_url_check check (
    avatar_url is null or avatar_url ~* '^https?://.{1,384}$'
  );

-- One unique username (stored lowercase → case-insensitive comparison) and one
-- unique friend code per account.
create unique index if not exists profiles_username_unique
  on public.profiles (username) where username is not null;
create unique index if not exists profiles_friend_code_unique
  on public.profiles (friend_code) where friend_code is not null;

-- Backfill friend codes for profiles created before this migration.
do $$
declare
  r record;
  v_code text;
begin
  for r in select id from public.profiles where friend_code is null loop
    loop
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      exit when not exists (select 1 from public.profiles where friend_code = v_code);
    end loop;
    update public.profiles set friend_code = v_code where id = r.id;
  end loop;
end $$;

-- Auto-create a profile (with friend code) for every brand-new auth user.
create or replace function public.handle_new_user() returns trigger as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.profiles where friend_code = v_code);
  end loop;
  insert into public.profiles (id, friend_code, display_name)
  values (new.id, v_code, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Username claim: atomic, validated, uniqueness-checked server-side.
create or replace function public.claim_username(p_username text) returns text as $$
declare
  v_clean text := lower(trim(p_username));
begin
  if v_clean !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Usernames must be 3-24 characters using letters, numbers or underscores';
  end if;
  if exists (select 1 from public.profiles where username = v_clean and id <> auth.uid()) then
    raise exception 'That username is already taken';
  end if;
  update public.profiles set username = v_clean where id = auth.uid();
  return v_clean;
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------ profile access (public data only)
-- Only these five columns are public. Personal settings/timezone remain
-- visible to their owner exclusively (own-row select policy below).
create or replace function public.public_profiles_by_ids(p_ids uuid[])
returns table (id uuid, username text, display_name text, avatar_url text, friend_code text)
language sql security definer stable set search_path = public as $$
  select id, username, display_name, avatar_url, friend_code
  from public.profiles
  where id = any (p_ids)
$$;

create or replace function public.search_users_by_username(p_username text)
returns table (id uuid, username text, display_name text, avatar_url text, friend_code text)
language sql security definer stable set search_path = public as $$
  select id, username, display_name, avatar_url, friend_code
  from public.profiles
  where username = lower(trim(p_username))
    and id <> auth.uid()
  limit 5
$$;

create or replace function public.search_users_by_code(p_code text)
returns table (id uuid, username text, display_name text, avatar_url text, friend_code text)
language sql security definer stable set search_path = public as $$
  select id, username, display_name, avatar_url, friend_code
  from public.profiles
  where friend_code = upper(trim(p_code))
    and id <> auth.uid()
  limit 1
$$;

revoke all on function public.public_profiles_by_ids(uuid[]) from anon;
revoke all on function public.search_users_by_username(text) from anon;
revoke all on function public.search_users_by_code(text) from anon;
grant execute on function public.public_profiles_by_ids(uuid[]) to authenticated;
grant execute on function public.search_users_by_username(text) to authenticated;
grant execute on function public.search_users_by_code(text) to authenticated;

-- Profiles RLS: the owner sees/updates their full row. Other signed-in users
-- see only the PUBLIC columns — through the search/profile functions above, not
-- the table. Anonymous users get nothing.
drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile upsert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
-- Guard: users may never change their user id or friend code; username only via
-- the validated claim_username() RPC.
create or replace function public.guard_profile_update() returns trigger as $$
begin
  if new.id <> old.id then
    raise exception 'Profile user id cannot change';
  end if;
  if new.friend_code <> old.friend_code then
    raise exception 'Friend codes cannot be changed';
  end if;
  if old.username is not null and coalesce(new.username, '') <> old.username then
    raise exception 'Usernames change only through claim_username()';
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists profiles_update_guard on public.profiles;
create trigger profiles_update_guard
  before update on public.profiles
  for each row when (pg_trigger_depth() = 1)
  execute function public.guard_profile_update();

-- ============================================================ FRIENDS
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (requester_id <> addressee_id)
);

-- One row per unordered pair: blocks duplicate pending requests in both
-- directions, and blocks a second request once a friendship exists. Removing
-- a friendship/requests deletes the row, so rejected or flushed pairs may
-- re-request later.
create unique index if not exists friend_requests_pair_unique
  on public.friend_requests (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );
create index if not exists friend_requests_addressee_idx
  on public.friend_requests (addressee_id, status);
create index if not exists friend_requests_requester_idx
  on public.friend_requests (requester_id, status);

alter table public.friend_requests enable row level security;

create policy "read own requests" on public.friend_requests for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
-- Only you can be the requester; the target profile must exist (usernames only;
-- no email column exists to enumerate).
create policy "send requests as self" on public.friend_requests for insert
  with check (
    auth.uid() = requester_id
    and exists (select 1 from public.profiles p where p.id = addressee_id and p.username is not null)
  );
-- Only the addressee may accept their own pending request (update trigger below
-- also blocks id forgeries and any other transition).
create policy "addressee accepts" on public.friend_requests for update
  using (auth.uid() = addressee_id and status = 'pending')
  with check (auth.uid() = addressee_id and status = 'accepted');
-- Cancel (requester, any state), reject (addressee, pending), remove friendship
-- (either side, accepted).
create policy "leave requests" on public.friend_requests for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create or replace function public.guard_friend_request_update() returns trigger as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id
     or new.created_at <> old.created_at then
    raise exception 'Only the status of a friend request can change';
  end if;
  if not (old.status = 'pending' and new.status = 'accepted') then
    raise exception 'A friend request can only move from pending to accepted';
  end if;
  new.resolved_at := now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists friend_request_update_guard on public.friend_requests;
create trigger friend_request_update_guard
  before update on public.friend_requests
  for each row when (pg_trigger_depth() = 1)
  execute function public.guard_friend_request_update();

-- ============================================================ GROUPS 2.0
alter table public.groups add column if not exists description text
  check (description is null or char_length(description) <= 280);
alter table public.groups add column if not exists invitations_enabled boolean not null default true;
alter table public.groups add column if not exists updated_at timestamptz not null default now();

-- Owner controls: rotate the join code, pause/resume invitations.
create or replace function public.regenerate_group_join_code(p_group_id uuid) returns text as $$
declare
  v_code text;
begin
  if not exists (
    select 1 from public.groups where id = p_group_id and owner_id = auth.uid()
  ) then
    raise exception 'Only the group owner can regenerate the join code';
  end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.groups where join_code = v_code);
  end loop;
  update public.groups
     set join_code = v_code, invitations_enabled = true, updated_at = now()
   where id = p_group_id and owner_id = auth.uid();
  return v_code;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.set_group_invitations_enabled(p_group_id uuid, p_enabled boolean)
returns void as $$
begin
  if not exists (
    select 1 from public.groups where id = p_group_id and owner_id = auth.uid()
  ) then
    raise exception 'Only the group owner can change invitation status';
  end if;
  update public.groups
     set invitations_enabled = p_enabled, updated_at = now()
   where id = p_group_id and owner_id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

-- Join-by-code: honors revoked invitations and reports WHY a code fails.
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
    return v_group.id; -- already a member; the client opens the room
  end if;
  if not v_group.invitations_enabled then
    raise exception 'Invitations to this group are paused by the owner';
  end if;
  select count(*) into v_count from public.group_members where group_id = v_group.id;
  if v_count >= 12 then
    raise exception 'Group is already at the 12 member limit';
  end if;
  insert into public.group_members (group_id, user_id, role) values (v_group.id, v_user, 'member');
  return v_group.id;
end;
$$ language plpgsql security definer set search_path = public;

-- The owner cannot leave their own group (would orphan it). Cascade deletes
-- from group removal skip the guard via pg_trigger_depth().
create or replace function public.guard_group_member_delete() returns trigger as $$
begin
  if old.role = 'owner' and pg_trigger_depth() = 1 then
    raise exception 'The group owner cannot leave — delete the group instead';
  end if;
  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists group_member_delete_guard on public.group_members;
create trigger group_member_delete_guard
  before delete on public.group_members
  for each row when (pg_trigger_depth() = 1)
  execute function public.guard_group_member_delete();

-- Owner role transfer (optional path for owner handover).
create or replace function public.transfer_group_ownership(p_group_id uuid, p_new_owner uuid)
returns void as $$
begin
  if not exists (select 1 from public.groups where id = p_group_id and owner_id = auth.uid()) then
    raise exception 'Only the group owner can transfer ownership';
  end if;
  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_new_owner and role = 'member'
  ) then
    raise exception 'The new owner must already be a member';
  end if;
  update public.group_members set role = 'owner'
    where group_id = p_group_id and user_id = auth.uid();
  update public.group_members set role = 'member'
    where group_id = p_group_id and role = 'owner' and user_id <> auth.uid();
  update public.groups set owner_id = p_new_owner, updated_at = now() where id = p_group_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.regenerate_group_join_code(uuid) from anon;
revoke all on function public.set_group_invitations_enabled(uuid, boolean) from anon;
revoke all on function public.join_group_by_code(text) from anon;
revoke all on function public.transfer_group_ownership(uuid, uuid) from anon;
grant execute on function public.regenerate_group_join_code(uuid) to authenticated;
grant execute on function public.set_group_invitations_enabled(uuid, boolean) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;

-- ============================================================ PRIVACY
-- Group members no longer get blanket access to each other's focus_sessions:
-- private history stays private. Group-level activity is shared through the
-- realtime room's presence channel + shared group_sessions events, which
-- members explicitly opt into by being present.
drop policy if exists "own sessions select" on public.focus_sessions;
create policy "own sessions select" on public.focus_sessions for select
  using (auth.uid() = user_id);

-- Realtime publication (run if your project allows; otherwise enable through
-- Dashboard → Database → Replication → supabase_realtime):
-- alter publication supabase_realtime add table public.group_members;
-- alter publication supabase_realtime add table public.group_sessions;
-- alter publication supabase_realtime add table public.groups;
