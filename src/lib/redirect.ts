/* Framework-free redirect-target validation, shared by the auth callback route. */

/** Only in-app, relative, single-slash paths are allowed — blocks
 * protocol-relative ("//evil.com") and backslash ("/\evil") open redirects. */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\") &&
    !value.includes("\\")
  ) {
    return value;
  }
  return fallback;
}
