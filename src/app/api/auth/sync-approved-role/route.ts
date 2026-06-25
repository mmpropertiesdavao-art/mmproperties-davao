export const dynamic = "force-dynamic";

// src/app/api/auth/sync-approved-role/route.ts
//
// After a user signs up or logs in, this checks whether their email has an
// approved seller/agent application. If yes, it upgrades their users.role,
// links the application to their user id, and creates an agents row if needed.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/supabase/server";

type ApprovedApplication = {
  id: string;
  requested_role: "seller" | "agent";
  application_type: string | null;
  email: string | null;
  full_name: string | null;
  phone: string | null;
};

export async function POST() {
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
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = data.user;
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ role: "buyer", synced: false });
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  const phone =
    typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone
      : null;

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

  const finalRole = application?.requested_role || "buyer";

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
      email,
      fullName || application?.full_name || null,
      phone || application?.phone || null,
      finalRole,
    ],
  });

  if (!application) {
    return NextResponse.json({
      synced: false,
      role: finalRole,
      message: "No approved seller/agent application found for this email.",
    });
  }

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

  return NextResponse.json({
    synced: true,
    role: finalRole,
    applicationId: application.id,
  });
}