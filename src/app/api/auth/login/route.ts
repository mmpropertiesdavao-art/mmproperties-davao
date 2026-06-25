export const dynamic = "force-dynamic";

// src/app/api/auth/login/route.ts
//
// Logs the user in, then checks whether their email has an approved
// seller/agent application. If yes, it upgrades users.role before returning
// the role to the login page.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/supabase/server";

type Role = "buyer" | "seller" | "agent" | "admin";

type ApprovedApplication = {
  id: string;
  requested_role: "seller" | "agent";
  application_type: string | null;
  email: string | null;
  full_name: string | null;
  phone: string | null;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function responseWithCookies(
  body: unknown,
  status: number,
  cookiesToSet: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[]
) {
  const response = NextResponse.json(body, { status });

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const email = clean(body.email).toLowerCase();
  const password = clean(body.password);

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();

  const cookiesToSet: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
                setAll: (
          items: {
            name: string;
            value: string;
            options: Record<string, unknown>;
          }[]
        ) => {
          items.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    }
  );

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError || !authData.user) {
    return responseWithCookies(
      { error: authError?.message || "Login failed." },
      401,
      cookiesToSet
    );
  }

  const user = authData.user;
  const userEmail = user.email?.trim().toLowerCase() || email;

  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : null;

  const metadataPhone =
    typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone.trim()
      : null;

  const { rows: existingUsers } = await db.query<{
    role: Role;
    full_name: string | null;
    phone: string | null;
  }>({
    text: `
      SELECT role, full_name, phone
      FROM users
      WHERE id = $1::uuid
      LIMIT 1
    `,
    values: [user.id],
  });

  const existingUser = existingUsers[0];

  const { rows: applications } = await db.query<ApprovedApplication>({
    text: `
      SELECT
        id,
        requested_role,
        application_type,
        email,
        full_name,
        phone
      FROM collaborator_applications
      WHERE lower(email) = lower($1)
        AND status = 'approved'
      ORDER BY
        CASE requested_role WHEN 'agent' THEN 0 WHEN 'seller' THEN 1 ELSE 2 END,
        reviewed_at DESC NULLS LAST,
        created_at DESC
      LIMIT 1
    `,
    values: [userEmail],
  });

  const application = applications[0];

  const finalRole: Role =
    existingUser?.role === "admin"
      ? "admin"
      : application?.requested_role || existingUser?.role || "buyer";

  await db.query({
    text: `
      INSERT INTO users (
        id,
        email,
        full_name,
        phone,
        role,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        now(),
        now()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(users.full_name, ''), EXCLUDED.full_name),
        phone = COALESCE(NULLIF(users.phone, ''), EXCLUDED.phone),
        role = CASE
          WHEN users.role = 'admin' THEN users.role
          ELSE EXCLUDED.role
        END,
        updated_at = now()
      RETURNING role
    `,
    values: [
      user.id,
      userEmail,
      existingUser?.full_name || metadataFullName || application?.full_name || null,
      existingUser?.phone || metadataPhone || application?.phone || null,
      finalRole,
    ],
  });

  if (application) {
    await db.query({
      text: `
        UPDATE collaborator_applications
        SET user_id = $2::uuid,
            updated_at = now()
        WHERE id = $1::uuid
      `,
      values: [application.id, user.id],
    });

    if (application.requested_role === "agent") {
      await db.query({
        text: `
          INSERT INTO agents (
            user_id,
            agency_name,
            license_number,
            service_area,
            created_at,
            updated_at
          )
          SELECT
            $1::uuid,
            ca.business_name,
            ca.prc_license_number,
            ca.service_area,
            now(),
            now()
          FROM collaborator_applications ca
          WHERE ca.id = $2::uuid
            AND NOT EXISTS (
              SELECT 1 FROM agents a WHERE a.user_id = $1::uuid
            )
        `,
        values: [user.id, application.id],
      });
    }
  }

  return responseWithCookies(
    {
      ok: true,
      role: finalRole,
      syncedApprovedApplication: Boolean(application),
    },
    200,
    cookiesToSet
  );
}