export const dynamic = "force-dynamic";

// src/app/api/auth/session/route.ts
//
// Receives the browser Supabase session and writes server cookies.
// Then checks approved seller/agent applications and upgrades role if needed.

import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const accessToken =
    typeof body.access_token === "string" ? body.access_token : null;
  const refreshToken =
    typeof body.refresh_token === "string" ? body.refresh_token : null;

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Missing Supabase session tokens." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    role: "buyer",
    destination: "/search",
  });

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
            options: Record<string, unknown>;
          }[]
        ) => {
          items.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: sessionData, error: sessionError } =
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

  if (sessionError || !sessionData.user) {
    return NextResponse.json(
      { error: sessionError?.message || "Could not set server session." },
      { status: 401 }
    );
  }

  const user = sessionData.user;
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    return response;
  }

  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name.trim()
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
    values: [email],
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
    `,
    values: [
      user.id,
      email,
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
    }).catch(() => null);

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
      }).catch(() => null);
    }
  }

  const destination = ["seller", "agent", "admin"].includes(String(finalRole))
  ? "/seller"
  : "/search";

  return NextResponse.json(
    {
      ok: true,
      role: finalRole,
      destination,
      syncedApprovedApplication: Boolean(application),
    },
    {
      headers: response.headers,
    }
  );
}