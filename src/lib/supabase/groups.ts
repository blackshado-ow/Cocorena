"use client";

/*
 * Study groups: creation, invitation-code joining (link or manual), owner
 * controls (regenerate code, pause invitations, remove members, transfer or
 * edit), and shared session events. Authorization lives in RLS + RPCs; the
 * client maps server messages to actionable copy.
 */
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface CloudGroup {
  id: string;
  name: string;
  description: string | null;
  join_code: string;
  invitations_enabled: boolean;
  owner_id: string;
  member_count: number;
  role: "owner" | "member";
  created_at: string;
}

export interface SharedSession {
  id: string;
  started_at: string;
  duration_minutes: number;
}

export type GroupResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface MyGroupSummary {
  id: string;
  name: string;
  description: string | null;
  join_code: string;
  invitations_enabled: boolean;
  owner_id: string;
  role: string;
}

export async function createCloudGroup(input: {
  name: string;
  description?: string | null;
}): Promise<GroupResult<MyGroupSummary>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "You need to be signed in." };

  const name = input.name.trim();
  if (name.length === 0 || name.length > 60) {
    return { ok: false, error: "Group names are 1–60 characters." };
  }
  const description = input.description?.trim() ? input.description.trim() : null;
  if (description && description.length > 280) {
    return { ok: false, error: "Descriptions are at most 280 characters." };
  }

  const { data, error } = await supabase
    .from("groups")
    .insert({ name, description, owner_id: userData.user.id })
    .select("id, name, description, join_code, invitations_enabled, owner_id, created_at")
    .single();
  if (error) {
    return { ok: false, error: error.message.includes("row-level") ? "Only signed-in users can create groups." : error.message };
  }
  return {
    ok: true,
    value: { ...data as Omit<MyGroupSummary, "role">, role: "owner" },
  };
}

/** Join a group by its invitation code; returns the group id to open. */
export async function joinByInvitationCode(rawCode: string): Promise<GroupResult<string>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const code = rawCode.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return { ok: false, error: "Invitation codes are 8 characters, like AB2CD4F9." };
  }
  const { data, error } = await supabase.rpc("join_group_by_code", { p_code: code });
  if (error) {
    const msg = error.message;
    return {
      ok: false,
      error: msg.includes("Invalid join code")
        ? "That code doesn't match any group."
        : msg.includes("paused")
          ? "Invitations to this group are paused by the owner."
          : msg.includes("12 member limit")
            ? "That group is full (12/12)."
            : msg,
    };
  }
  return { ok: true, value: data as string };
}

export async function loadMyGroups(): Promise<GroupResult<MyGroupSummary[]>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "You need to be signed in." };

  const { data: memberships, error: mErr } = await supabase
    .from("group_members")
    .select("role, groups ( id, name, description, join_code, invitations_enabled, owner_id, created_at )")
    .eq("user_id", userData.user.id);
  if (mErr) return { ok: false, error: mErr.message };

  const summaries: MyGroupSummary[] = [];
  for (const m of (memberships ?? []) as unknown as {
    role: string;
    groups: {
      id: string; name: string; description: string | null; join_code: string;
      invitations_enabled: boolean; owner_id: string; created_at: string;
    } | null;
  }[]) {
    if (!m.groups) continue;
    summaries.push({
      id: m.groups.id,
      name: m.groups.name,
      description: m.groups.description,
      join_code: m.groups.join_code,
      invitations_enabled: m.groups.invitations_enabled,
      owner_id: m.groups.owner_id,
      role: m.role,
    });
  }
  return { ok: true, value: summaries };
}

export async function regenerateJoinCode(groupId: string): Promise<GroupResult<string>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { data, error } = await supabase.rpc("regenerate_group_join_code", { p_group_id: groupId });
  if (error) {
    return { ok: false, error: error.message.includes("owner") ? "Only the group owner can regenerate the code." : error.message };
  }
  return { ok: true, value: data as string };
}

export async function setInvitationsEnabled(groupId: string, enabled: boolean): Promise<GroupResult<boolean>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { error } = await supabase.rpc("set_group_invitations_enabled", { p_group_id: groupId, p_enabled: enabled });
  if (error) {
    return { ok: false, error: error.message.includes("owner") ? "Only the group owner can change this." : error.message };
  }
  return { ok: true, value: enabled };
}

export async function leaveGroup(groupId: string): Promise<GroupResult<void>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "You need to be signed in." };
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userData.user.id);
  if (error) {
    return { ok: false, error: error.message.includes("owner cannot leave")
      ? "Owners can't leave their own group — delete the group or transfer ownership first."
      : error.message };
  }
  return { ok: true, value: undefined };
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<GroupResult<void>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "You need to be signed in." };
  if (memberId === userData.user.id) return leaveGroup(groupId);
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberId);
  if (error) {
    return { ok: false, error: error.message.includes("owner cannot leave")
      ? "The owner can't be removed."
      : error.message };
  }
  return { ok: true, value: undefined };
}

/** Start a shared synchronized session (the existing group_sessions event). */
export async function startSharedSession(groupId: string, minutes = 25): Promise<SimpleResultLike> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "You need to be signed in." };
  const { error } = await supabase.from("group_sessions").insert({
    group_id: groupId,
    created_by: userData.user.id,
    duration_minutes: minutes,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface SimpleResultLike {
  ok: boolean;
  error?: string;
}

export async function deleteCloudGroup(groupId: string): Promise<GroupResult<void>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) {
    return { ok: false, error: error.message.includes("row-level") ? "Only the owner can delete this group." : error.message };
  }
  return { ok: true, value: undefined };
}

/** Source URL that a group member can share; friends open it and join. */
export function joinLinkForCode(code: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  return `${origin}/groups/join?code=${encodeURIComponent(code)}`;
}
