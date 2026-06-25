export const dynamic = "force-dynamic";

// src/app/api/admin/collaborators/route.ts
//
// Admin review API for seller, agent, and collaborator applications.
// Supports old account-based applications and new public form-based
// applications where user_id starts as null.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

type RequestedRole = "seller" | "agent";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function siteUrl(req: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;

  if (fromEnv) {
    if (fromEnv.startsWith("http")) return fromEnv;
    return `https://${fromEnv}`;
  }

  return req.nextUrl.origin;
}

export async function GET() {
  const actor = await requireRole(["admin"]);
  if (!actor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { rows } = await db.query({
    text: `
      SELECT
        ca.id,
        ca.user_id AS "userId",

        COALESCE(ca.email, u.email) AS email,
        COALESCE(ca.full_name, u.full_name) AS "fullName",
        COALESCE(ca.phone, u.phone) AS phone,

        ca.requested_role AS "requestedRole",
        COALESCE(ca.application_type, ca.requested_role) AS "applicationType",

        ca.business_name AS "businessName",
        ca.prc_license_number AS "prcLicenseNumber",
        ca.profession,
        ca.service_area AS "serviceArea",

        ca.property_address AS "propertyAddress",
        ca.property_type AS "propertyType",
        ca.is_property_owner AS "isPropertyOwner",

        ca.consent_confirmed AS "consentConfirmed",
        ca.message,
        ca.status,

        ca.source,
        ca.ghl_sent_at AS "ghlSentAt",
        ca.ghl_error AS "ghlError",

        ca.created_at AS "createdAt",
        ca.reviewed_at AS "reviewedAt",
        ca.updated_at AS "updatedAt"
      FROM collaborator_applications ca
      LEFT JOIN users u ON u.id = ca.user_id
      ORDER BY
        CASE ca.status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          WHEN 'rejected' THEN 2
          ELSE 3
        END,
        ca.created_at DESC
    `,
    values: [],
  });

  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
  const actor = await requireRole(["admin"]);
  if (!actor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.applicationId || "");
  const action = String(body.action || "");

  if (!applicationId || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Choose an application and a valid action." },
      { status: 400 }
    );
  }

  const { rows: applications } = await db.query<{
    id: string;
    user_id: string | null;
    requested_role: RequestedRole;
    application_type: string | null;
    status: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
  }>({
    text: `
      SELECT
        id,
        user_id,
        requested_role,
        application_type,
        status,
        email,
        full_name,
        phone
      FROM collaborator_applications
      WHERE id = $1::uuid
      LIMIT 1
    `,
    values: [applicationId],
  });

  const application = applications[0];

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  if (application.status !== "pending") {
    return NextResponse.json(
      { error: "This application has already been reviewed." },
      { status: 409 }
    );
  }

  if (action === "reject") {
    await db.query({
      text: `
        UPDATE collaborator_applications
        SET status = 'rejected',
            reviewed_at = now(),
            updated_at = now()
        WHERE id = $1::uuid
      `,
      values: [applicationId],
    });

    return NextResponse.json({ success: true, status: "rejected" });
  }

  let userId = application.user_id;

  if (!userId) {
    const email = application.email?.trim().toLowerCase();
    const fullName = application.full_name?.trim() || null;
    const phone = application.phone?.trim() || null;

    if (!email) {
      return NextResponse.json(
        { error: "This application has no email address, so an account invite cannot be created." },
        { status: 400 }
      );
    }

    const { rows: existingUsers } = await db.query<{ id: string }>({
      text: `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      values: [email],
    });

    if (existingUsers[0]) {
      userId = existingUsers[0].id;
    } else {
      const supabaseAdmin = getSupabaseAdmin();

      const redirectTo = `${siteUrl(req)}/login`;

      const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          full_name: fullName,
          phone,
          approved_role: application.requested_role,
          source: "MM Properties application approval",
        },
      });

      if (inviteResult.error || !inviteResult.data.user) {
        return NextResponse.json(
          {
            error:
              inviteResult.error?.message ||
              "Could not create Supabase invite for this applicant.",
          },
          { status: 500 }
        );
      }

      userId = inviteResult.data.user.id;

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
            full_name = COALESCE(users.full_name, EXCLUDED.full_name),
            phone = COALESCE(users.phone, EXCLUDED.phone),
            role = EXCLUDED.role,
            updated_at = now()
        `,
        values: [userId, email, fullName, phone, application.requested_role],
      });
    }

    await db.query({
      text: `
        UPDATE collaborator_applications
        SET user_id = $2::uuid,
            updated_at = now()
        WHERE id = $1::uuid
      `,
      values: [applicationId, userId],
    });
  }

  await db.query({
    text: `
      UPDATE users
      SET role = $1,
          updated_at = now()
      WHERE id = $2::uuid
    `,
    values: [application.requested_role, userId],
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
          ca.user_id,
          ca.business_name,
          ca.prc_license_number,
          ca.service_area,
          now(),
          now()
        FROM collaborator_applications ca
        WHERE ca.id = $1::uuid
          AND ca.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM agents a WHERE a.user_id = ca.user_id
          )
      `,
      values: [applicationId],
    });
  }

  await db.query({
    text: `
      UPDATE collaborator_applications
      SET status = 'approved',
          reviewed_at = now(),
          updated_at = now()
      WHERE id = $1::uuid
    `,
    values: [applicationId],
  });

  return NextResponse.json({
    success: true,
    status: "approved",
    userId,
    role: application.requested_role,
  });
}