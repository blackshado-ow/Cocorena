import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/* OAuth / magic-link code exchange (Supabase SSR flow). Safe no-op without credentials. */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (code) {
    const response = NextResponse.redirect(new URL("/", request.url));
    let cookieResponse = response;
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookieResponse = NextResponse.redirect(new URL("/", request.url));
          cookiesToSet.forEach(({ name, value, options }) => cookieResponse.cookies.set(name, value, options));
        },
      },
    });
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
    return cookieResponse;
  }
  return NextResponse.redirect(new URL("/auth", request.url));
}
