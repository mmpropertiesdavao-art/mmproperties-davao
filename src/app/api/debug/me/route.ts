export const dynamic = "force-dynamic";

// TEMPORARY DEBUG ROUTE
// Shows the currently logged-in Supabase user and matching public.users row.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/supabase/server";

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => undefined,
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({
      authenticated: false,
      authError: error?.message || null,
    });
  }

  const user = data.user;

  const { rows } = await db.query({
    text: `
      SELECT id, email, full_name, phone, role, created_at, updated_at
      FROM users
      WHERE id = $1::uuid
      LIMIT 1
    `,
    values: [user.id],
  });

  const { rows: applications } = await db.query({
    text: `
      SELECT id, email, requested_role, status, user_id, created_at, reviewed_at, updated_at
      FROM collaborator_applications
      WHERE lower(email) = lower($1)
         OR user_id = $2::uuid
      ORDER BY created_at DESC
    `,
    values: [user.email || "", user.id],
  });

  return NextResponse.json({
    authenticated: true,
    authUser: {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    },
    publicUser: rows[0] || null,
    applications,
  });
}