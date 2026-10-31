import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeNextPath } from "@/lib/redirect";

/* OAuth / magic-link code exchange (Supabase SSR flow). Safe no-op without credentials.
 * The redirect target can be overridden with ?next=/some-path (in-app paths only). */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fallback = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (!url || !anonKey) {
    return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(fallback)}`, request.url));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (code) {
    const response = NextResponse.redirect(new URL(fallback, request.url));
    let cookieResponse = response;
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookieResponse = NextResponse.redirect(new URL(fallback, request.url));
          cookiesToSet.forEach(({ name, value, options }) => cookieResponse.cookies.set(name, value, options));
        },
      },
    });
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(fallback)}`, request.url));
    }
    return cookieResponse;
  }
  return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(fallback)}`, request.url));
}
