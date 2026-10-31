"use client";

/*
 * Profiles: creation (DB trigger creates the row + friend code), fetching,
 * username claiming (validated server-side by the claim_username RPC), and
 * edits of the owner-editable fields (display_name, avatar_url).
 *
 * There is intentionally no email column in profiles — auth.users owns the
 * address and nothing public ever touches it.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateUsername } from "@/lib/social-utils";

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  friend_code: string;
  created_at: string;
  updated_at: string;
}

export type ProfileResult = { profile: ProfileRow } | { error: string };

const publicColumns = "id, username, display_name, avatar_url, friend_code, created_at, updated_at";

/** Read the signed-in user's own profile row. Creates nothing — the DB trigger
 * created it at signup; if it is somehow missing we upsert a bare row and
 * re-read (the trigger's on-conflict keeps it idempotent). */
export async function fetchOwnProfile(): Promise<ProfileResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Cloud not configured." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "You need to be signed in." };
  return readProfile(supabase, userData.user);
}

async function readProfile(supabase: SupabaseClient, user: User): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select(publicColumns)
    .eq("id", user.id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (data) return { profile: data as ProfileRow };

  // Missing row (e.g. account created before the trigger was applied):
  // create it with a friend code rather than failing the session.
  let code = "";
  for (let i = 0; i < 5; i++) {
    code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const { error: upsertError } = await supabase.from("profiles").upsert({ id: user.id, friend_code: code });
    if (!upsertError) break;
    if (upsertError.code === "23505") continue; // code collision — try again
    return { error: upsertError.message };
  }
  const second = await supabase.from("profiles").select(publicColumns).eq("id", user.id).maybeSingle();
  if (second.error || !second.data) return { error: second.error?.message ?? "Profile could not be created." };
  return { profile: second.data as ProfileRow };
}

/** Claim (or re-claim, when still null) a username for the signed-in user.
 * Uniqueness and format are enforced by the server RPC. */
export async function claimUsername(username: string): Promise<ProfileResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Cloud not configured." };
  const validation = validateUsername(username);
  if (!validation.ok) return { error: validation.error };
  const { error } = await supabase.rpc("claim_username", { p_username: validation.username });
  if (error) {
    return { error: friendlyUsernameError(error.message) };
  }
  return fetchOwnProfile();
}

function friendlyUsernameError(message: string): string {
  if (message.includes("already taken")) return "That username is already taken — try another.";
  if (message.includes("3-24")) return message;
  return message;
}

/** Edit the owner-controlled public fields. Usernames and friend codes are NOT
 * editable here (guard trigger + claim_username RPC handle those). */
export async function updateProfile(patch: {
  display_name?: string | null;
  avatar_url?: string | null;
}): Promise<ProfileResult | { error: string }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Cloud not configured." };
  const clean: Record<string, string | null> = {};
  if (patch.display_name !== undefined) clean.display_name = patch.display_name?.trim() || null;
  if (patch.avatar_url !== undefined) clean.avatar_url = patch.avatar_url?.trim() || null;
  if (clean.avatar_url && !/^https?:\/\//i.test(clean.avatar_url)) {
    return { error: "Avatars must be an http(s) image or page URL, or empty." };
  }
  if (Object.keys(clean).length === 0) return fetchOwnProfile();
  const { error } = await supabase.from("profiles").update(clean).eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");
  if (error) {
    return { error: error.message.includes("avatar_url") ? "That avatar URL isn't allowed." : error.message };
  }
  return fetchOwnProfile();
}
