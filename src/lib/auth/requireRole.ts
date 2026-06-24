// src/lib/auth/requireRole.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export type Role = "buyer" | "seller" | "agent" | "admin";

export async function requireRole(
  allowed: Role[]
): Promise<{ userId: string; role: Role } | null> {

  // DEVELOPMENT BYPASS
  if (process.env.NODE_ENV === "development") {
    return {
      userId: "00000000-0000-0000-0000-000000000000",
      role: "admin",
    };
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot always write refreshed cookies. Route
            // handlers and the next browser request will complete the refresh.
          }
        },
      },
    }
  );

  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (!profile || !allowed.includes(profile.role as Role)) {
    return null;
  }

  return {
    userId: authData.user.id,
    role: profile.role as Role,
  };
}
