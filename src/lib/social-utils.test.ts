import { describe, expect, it } from "vitest";
import {
  normalizeFriendCode,
  otherUserId,
  presencePayload,
  profileInitials,
  profileLabel,
  requestSide,
  validateUsername,
} from "@/lib/social-utils";

describe("validateUsername", () => {
  it("accepts valid lowercase usernames and normalizes case", () => {
    expect(validateUsername("  StudyOwl ")).toEqual({ ok: true, username: "studyowl" });
    expect(validateUsername("a_1")).toEqual({ ok: true, username: "a_1" });
  });

  it("rejects too-short, too-long, and invalid characters", () => {
    expect(validateUsername("ab").ok).toBe(false);
    expect(validateUsername("a".repeat(25)).ok).toBe(false);
    expect(validateUsername("has space").ok).toBe(false);
    expect(validateUsername("has-dash").ok).toBe(false);
    expect(validateUsername("").ok).toBe(false);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateUsername("   ")).toMatchObject({ ok: false });
  });
});

describe("normalizeFriendCode", () => {
  it("uppercases and validates 8-character codes", () => {
    expect(normalizeFriendCode("ab2c d4f9")).toBe("AB2CD4F9");
  });

  it("rejects wrong lengths and empty input", () => {
    expect(normalizeFriendCode("AB2CD4F")).toBe(null);
    expect(normalizeFriendCode("")).toBe(null);
    expect(normalizeFriendCode("123456789")).toBe(null);
  });
});

describe("requestSide", () => {
  const me = "u1";
  it("classifies incoming and outgoing correctly", () => {
    expect(requestSide({ requester_id: "u2", addressee_id: me }, me)).toBe("incoming");
    expect(requestSide({ requester_id: me, addressee_id: "u2" }, me)).toBe("outgoing");
  });

  it("returns null for unrelated rows", () => {
    expect(requestSide({ requester_id: "u2", addressee_id: "u3" }, me)).toBe(null);
  });
});

describe("otherUserId", () => {
  it("extracts the other participant", () => {
    expect(otherUserId({ requester_id: "u2", addressee_id: "u1" }, "u1")).toBe("u2");
    expect(otherUserId({ requester_id: "u1", addressee_id: "u3" }, "u1")).toBe("u3");
    expect(otherUserId({ requester_id: "u2", addressee_id: "u3" }, "u1")).toBe(null);
  });
});

describe("profileLabel and profileInitials", () => {
  it("prefers display name, then username, then a neutral pseudonym", () => {
    expect(profileLabel({ display_name: "Ada L.", username: "ada" })).toBe("Ada L.");
    expect(profileLabel({ display_name: null, username: "ada" })).toBe("ada");
    expect(profileLabel(undefined)).toBe("student");
  });

  it("derives two-letter initials", () => {
    expect(profileInitials("Ada Lovelace")).toBe("AL");
    expect(profileInitials("study_owl")).toBe("SO");
    expect(profileInitials("ada")).toBe("AD");
  });
});

describe("presencePayload", () => {
  it("reports focusing when any timer runs", () => {
    expect(presencePayload({
      pomodoroRunningFocus: true,
      stopwatchRunning: false,
      countdownRunning: false,
      pomodoroPaused: false,
      todayMinutes: 12,
    })).toEqual({ status: "focusing", focus_minutes_today: 12 });
  });

  it("reports on-break only for a paused pomodoro", () => {
    expect(presencePayload({
      pomodoroRunningFocus: false,
      stopwatchRunning: false,
      countdownRunning: false,
      pomodoroPaused: true,
      todayMinutes: 5,
    })).toEqual({ status: "on-break", focus_minutes_today: 5 });
  });

  it("reports idle otherwise", () => {
    expect(presencePayload({
      pomodoroRunningFocus: false,
      stopwatchRunning: false,
      countdownRunning: false,
      pomodoroPaused: false,
      todayMinutes: 0,
    })).toEqual({ status: "idle", focus_minutes_today: 0 });
  });
});
