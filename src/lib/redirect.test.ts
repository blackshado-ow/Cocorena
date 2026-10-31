import { describe, expect, it } from "vitest";
import { joinLinkForCode } from "@/lib/supabase/groups";
import { safeNextPath } from "@/lib/redirect";

describe("safeNextPath", () => {
  it("keeps in-app absolute paths, including query strings", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/groups/abc-123")).toBe("/groups/abc-123");
    expect(safeNextPath("/auth?reset=1")).toBe("/auth?reset=1");
  });

  it("falls back for null, empty, and non-path input", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("auth")).toBe("/");
  });

  it("blocks protocol-relative and backslash open redirects", () => {
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("/auth\\evil")).toBe("/");
  });

  it("honors a custom fallback", () => {
    expect(safeNextPath(null, "/groups")).toBe("/groups");
  });
});

describe("joinLinkForCode", () => {
  it("builds a shareable join link with the encoded code", () => {
    expect(joinLinkForCode("AB2CD4F9", "https://cocorena.vercel.app")).toBe(
      "https://cocorena.vercel.app/groups/join?code=AB2CD4F9",
    );
  });

  it("URL-encodes codes that contain special characters", () => {
    expect(joinLinkForCode("A B+C&D", "https://x.test")).toBe("https://x.test/groups/join?code=A%20B%2BC%26D");
  });
});
