import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

  const allCookies = cookieStore.getAll();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => allCookies,
        setAll: () => {},
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    host: headerStore.get("host"),
    supabaseUrl,
    expectedCookieStartsWith: `sb-${projectRef}`,
    receivedCookieNames: allCookies.map((c) => c.name),
    userEmail: data.user?.email ?? null,
    error: error?.message ?? null,
  });
}