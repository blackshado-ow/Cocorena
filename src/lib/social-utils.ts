/* Pure social-layer helpers. Kept framework-free and testable. */

export interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  friend_code: string;
}

/** Username rules (mirrors the DB check constraint): 3–24 chars, lowercase
 * letters, digits, underscores; stored lowercase → case-insensitive equality. */
export function validateUsername(input: string): { ok: true; username: string } | { ok: false; error: string } {
  const cleaned = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(cleaned)) {
    return {
      ok: false,
      error: "Usernames must be 3–24 characters using lowercase letters, numbers, or underscores.",
    };
  }
  return { ok: true, username: cleaned };
}

/** Friend codes: 8 characters from the unambiguous code alphabet. Whitespace
 * anywhere in the input (people often type them grouped) is ignored. */
const CODE_ALPHABET = /^[A-Z0-9]{8}$/;

export function normalizeFriendCode(input: string): string | null {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  return CODE_ALPHABET.test(cleaned) ? cleaned : null;
}

/** Which side of a request row the signed-in user is on. */
export type RequestSide = "incoming" | "outgoing";

export function requestSide(
  row: { requester_id: string; addressee_id: string },
  myId: string,
): RequestSide | null {
  if (row.requester_id === myId) return "outgoing";
  if (row.addressee_id === myId) return "incoming";
  return null;
}

/** From accepted request rows, the id of the *other* person. */
export function otherUserId(
  row: { requester_id: string; addressee_id: string },
  myId: string,
): string | null {
  if (row.requester_id === myId) return row.addressee_id;
  if (row.addressee_id === myId) return row.requester_id;
  return null;
}

/** Public label for a profile: display name if present, else username, else a
 * short stable pseudonym. Never an email address — none is stored. */
export function profileLabel(profile: { display_name?: string | null; username?: string | null } | undefined): string {
  const name = profile?.display_name?.trim();
  if (name) return name;
  const username = profile?.username?.trim();
  if (username) return username;
  return "student";
}

/** Initials for an avatar fallback circle. */
export function profileInitials(label: string): string {
  const parts = label.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

/** Build the canonical group-room presence payload from local timer state.
 * Shares only derived, non-private numbers: coarse status + today's minutes. */
export function presencePayload(input: {
  pomodoroRunningFocus: boolean;
  stopwatchRunning: boolean;
  countdownRunning: boolean;
  pomodoroPaused: boolean;
  todayMinutes: number;
}): { status: "focusing" | "on-break" | "idle"; focus_minutes_today: number } {
  if (input.stopwatchRunning || input.pomodoroRunningFocus || input.countdownRunning) {
    return { status: "focusing", focus_minutes_today: input.todayMinutes };
  }
  if (input.pomodoroPaused) return { status: "on-break", focus_minutes_today: input.todayMinutes };
  return { status: "idle", focus_minutes_today: input.todayMinutes };
}

export const STATUS_LABEL: Record<string, string> = {
  focusing: "focusing now",
  "on-break": "on break",
  idle: "in the room",
};
