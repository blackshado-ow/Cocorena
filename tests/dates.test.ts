import { describe, expect, it } from "vitest";
import { addDaysKey, dayKey, diffDays, isValidDayKey, monthMatrix } from "@/lib/dates";

describe("day key / timezone policy", () => {
  const ts = Date.parse("2026-01-15T23:00:00Z"); // 11:30 PM UTC

  it("buckets the same instant into different local days by timezone", () => {
    // In Kolkata (UTC+5:30) it is already the 16th at that instant.
    expect(dayKey(ts, "Asia/Kolkata")).toBe("2026-01-16");
    // In New York (UTC-5) it is still mid-afternoon on the 15th.
    expect(dayKey(ts, "America/New_York")).toBe("2026-01-15");
    // UTC itself: same evening.
    expect(dayKey(ts, "UTC")).toBe("2026-01-15");
  });

  it("day-of-year arithmetic ignores DST by working on plain UTC date keys", () => {
    expect(diffDays("2026-01-15", "2026-01-16")).toBe(1);
    expect(diffDays("2026-01-16", "2026-01-15")).toBe(-1);
    expect(diffDays("2026-02-28", "2026-03-01")).toBe(1); // 2026 not a leap year
    expect(diffDays("2028-02-28", "2028-03-01")).toBe(2); // leap year
  });

  it("addDaysKey walks the calendar safely", () => {
    expect(addDaysKey("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("validates day keys strictly", () => {
    expect(isValidDayKey("2026-01-15")).toBe(true);
    expect(isValidDayKey("2026-13-01")).toBe(false);
    expect(isValidDayKey("2026-02-30")).toBe(false);
    expect(isValidDayKey("2026-1-5")).toBe(false);
  });

  it("monthMatrix starts on Monday and returns 6 weeks", () => {
    const cells = monthMatrix(2026, 0); // Jan 2026, starts Thursday
    expect(cells).toHaveLength(42);
    expect(cells[0].key).toBe("2025-12-29"); // Monday before
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });
});
