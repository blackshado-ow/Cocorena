import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/*
 * Next.js 16 proxy (successor of middleware). When Supabase credentials exist,
 * it refreshes the auth session cookie on navigation. When credentials are
 * absent (pure guest mode) it is a no-op and costs nothing.
 */
export default function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Only refresh the session; no redirects, guest mode stays first-class.
  supabase.auth.getUser().catch(() => undefined);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|illustrations|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
