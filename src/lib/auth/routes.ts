export const HOME_AFTER_LOGIN = "/dashboard";
export const LOGIN_PATH = "/login";

// Reachable without signing in. Everything else requires a session.
const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/health"];
const PUBLIC_PREFIXES = ["/auth/"];

// Signed-in users have no reason to see these, so they go to the dashboard.
const SIGNED_OUT_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function isSignedOutOnlyPath(pathname: string): boolean {
  return SIGNED_OUT_ONLY_PATHS.includes(pathname);
}

/**
 * Returns `next` only if it is a same-site path, so a crafted link like
 * /login?next=https://evil.example can't redirect users off the site.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback: string = HOME_AFTER_LOGIN,
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // Backslashes are treated like slashes by some browsers ("/\evil.example").
  if (next.includes("\\")) return fallback;
  try {
    const url = new URL(next, "http://placeholder.invalid");
    if (url.origin !== "http://placeholder.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
