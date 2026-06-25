export const dynamic = "force-dynamic";

// src/app/auth/callback/route.ts
//
// Handles Google OAuth callback.
// After Supabase creates the session, this checks approved seller/agent applications.
// If approved, it upgrades the user role and redirects to /seller.
// Otherwise, buyer/visitor accounts go to /search.

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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

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

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  let destination = "/search";

  if (user?.email) {
    const email = user.email.trim().toLowerCase();

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

    destination = ["seller", "agent", "admin"].includes(String(finalRole))
  ? "/seller"
  : "/search";
  }

  const response = NextResponse.redirect(new URL(destination, requestUrl.origin));

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}