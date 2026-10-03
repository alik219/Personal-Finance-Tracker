import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  HOME_AFTER_LOGIN,
  isPublicPath,
  isSignedOutOnlyPath,
  LOGIN_PATH,
} from "@/lib/auth/routes";
import { getPublicEnv } from "@/lib/env";

import type { Database } from "./types";

/**
 * Refreshes the auth session cookie on every request and applies the
 * optimistic route rules. Pages still verify the user themselves
 * (see lib/auth/session.ts); this only saves a round trip.
 */
export async function updateSession(request: NextRequest) {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Must run right after creating the client: it validates the JWT and
  // triggers the cookie refresh above when the access token has expired.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && !isPublicPath(pathname)) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("next", pathname + search);
    return redirectKeepingCookies(url, response);
  }

  if (signedIn && isSignedOutOnlyPath(pathname)) {
    return redirectKeepingCookies(
      new URL(HOME_AFTER_LOGIN, request.url),
      response,
    );
  }

  return response;
}

// A redirect must carry any refreshed session cookies, or the user would be
// signed out on the next request.
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "location") redirect.headers.set(key, value);
  });
  return redirect;
}
