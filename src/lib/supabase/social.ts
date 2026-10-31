"use client";

/*
 * Friends: search by exact username or friend code, requests lifecycle, and
 * friendship management. All authorization is enforced by RLS in
 * supabase/migrations/0002_accounts_friends_groups.sql — this module is a thin,
 * honest wrapper that also maps the pair-unique errors to friendly copy.
 */
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeFriendCode as normalizeCode } from "@/lib/social-utils";
import type { PublicProfile } from "@/lib/social-utils";
import { otherUserId, profileLabel, requestSide } from "@/lib/social-utils";

export type { PublicProfile };

export interface FriendRequestRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
}

/** One entry per relationship in any state; `requestId` is the friendship/request
 * row id (used for cancel / accept / remove mutations). */
export type Friend =
  | { kind: "friend"; friend: PublicProfile; requestId: string }
  | { kind: "incoming"; friend: PublicProfile; requestId: string }
  | { kind: "outgoing"; friend: PublicProfile; requestId: string };

export interface SocialState {
  friends: Friend[];
  error: string | null;
}

/* ------------------------------------------------------------------ search */

export type SearchResult =
  | { ok: true; profile: PublicProfile }
  | { ok: false; error: string; notFound?: boolean };

export async function searchByExactUsername(username: string, myId: string): Promise<SearchResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const cleaned = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(cleaned)) {
    return { ok: false, error: "Usernames are 3–24 characters: lowercase letters, numbers, or underscores." };
  }
  const { data, error } = await supabase.rpc("search_users_by_username", { p_username: cleaned });
  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as PublicProfile[];
  const hit = rows.find((r) => r.id !== myId);
  if (!hit) return { ok: false, error: `No user with the username “${cleaned}”.`, notFound: true };
  return { ok: true, profile: hit };
}

export async function searchByFriendCode(code: string, myId: string): Promise<SearchResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const cleaned = normalizeCode(code) ?? code.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(cleaned)) {
    return { ok: false, error: "Friend codes are 8 characters, like AB2CD4F9." };
  }
  const { data, error } = await supabase.rpc("search_users_by_code", { p_code: cleaned });
  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as PublicProfile[];
  const hit = rows.find((r) => r.id !== myId);
  if (!hit) return { ok: false, error: `No user with the friend code ${cleaned}.`, notFound: true };
  return { ok: true, profile: hit };
}

/* ---------------------------------------------------------------- lifecycle */

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function sendFriendRequest(targetId: string): Promise<SimpleResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "You need to be signed in." };
  if (userData.user.id === targetId) return { ok: false, error: "You're already in contact with yourself." };

  const { error } = await supabase.from("friend_requests").insert({
    requester_id: userData.user.id,
    addressee_id: targetId,
    status: "pending",
  });
  if (error) return { ok: false, error: friendlyRequestError(error.message) };
  return { ok: true };
}

export async function acceptFriendRequest(requestId: string): Promise<SimpleResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "accepted", resolved_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return { ok: false, error: friendlyRequestError(error.message) };
  return { ok: true };
}

/** Cancels (as requester) or rejects (as addressee) a pending request;
 * removes the friendship when it was already accepted. */
export async function removeRequestOrFriendship(requestId: string): Promise<SimpleResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Cloud not configured." };
  const { error } = await supabase.from("friend_requests").delete().eq("id", requestId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function friendlyRequestError(message: string): string {
  if (message.includes("duplicate key value")) {
    return "There's already a pending request or friendship between you two.";
  }
  if (message.includes("friend request can only move")) return "That request was already handled.";
  if (message.includes("Only the status")) return "That request can't be edited that way.";
  return message;
}

/* ------------------------------------------------------------------ loading */

/** Load everything: accepted friendships + both request directions, with the
 * public profile of each other person attached. */
export async function loadSocialState(): Promise<SocialState> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { friends: [], error: null };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { friends: [], error: null };
  const myId = userData.user.id;

  const { data: rows, error } = await supabase
    .from("friend_requests")
    .select("id, requester_id, addressee_id, status, created_at");
  if (error) return { friends: [], error: error.message };
  if (!rows) return { friends: [], error: null };

  const requestRows = rows as FriendRequestRow[];
  const otherIds = new Set<string>();
  for (const row of requestRows) {
    const other = otherUserId(row, myId);
    if (other) otherIds.add(other);
  }

  let profiles: PublicProfile[] = [];
  if (otherIds.size > 0) {
    const { data: profileRows, error: profileError } = await supabase.rpc("public_profiles_by_ids", {
      p_ids: Array.from(otherIds),
    });
    if (profileError) return { friends: [], error: profileError.message };
    profiles = (profileRows ?? []) as PublicProfile[];
  }
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const friends: Friend[] = [];
  for (const row of requestRows) {
    const side = requestSide(row, myId);
    if (!side) continue;
    const other = otherUserId(row, myId);
    if (!other) continue;
    const profile = byId.get(other);
    if (!profile) continue;
    if (row.status === "accepted") {
      friends.push({ kind: "friend", friend: profile, requestId: row.id });
    } else if (side === "incoming") {
      friends.push({ kind: "incoming", friend: profile, requestId: row.id });
    } else {
      friends.push({ kind: "outgoing", friend: profile, requestId: row.id });
    }
  }
  return { friends, error: null };
}

/** Convenience: label of a friend entry for UI text. */
export function friendLabel(f: Friend): string {
  return profileLabel(f.friend);
}
