import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") || "/search";

  const response = NextResponse.redirect(
    new URL(next, request.url)
  );

  console.log("OAuth callback hit", {
    hasCode: !!code,
    url: request.url,
  });

  if (!code) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          items: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) =>
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  );

  const { data, error } =
    await supabase.auth.exchangeCodeForSession(code);

  console.log("OAuth exchange result", {
    email: data?.user?.email,
    hasSession: !!data?.session,
    error: error?.message,
  });

  if (error) {
    console.error("OAuth exchange failed", error);
  }

  return response;
}