export const dynamic = "force-dynamic";

// src/app/api/admin/collaborators/route.ts
//
// Admin review API for seller, agent, and collaborator applications.
// Approval does not rely on Supabase invite emails.
// GHL contact tags trigger applicant communication workflows.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";
import { upsertGhlContact } from "@/lib/ghl";

type RequestedRole = "seller" | "agent";

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

    try {
      await upsertGhlContact({
        name: application.full_name,
        email: application.email,
        phone: application.phone,
        tags: ["Application Rejected"],
        customFields: {
          application_status: "Rejected",
          requested_role: application.requested_role,
          application_type: application.application_type || application.requested_role,
          mm_properties_application_id: application.id,
        },
      });
    } catch (error) {
      await db.query({
        text: `
          UPDATE collaborator_applications
          SET ghl_error = $2,
              updated_at = now()
          WHERE id = $1::uuid
        `,
        values: [
          applicationId,
          error instanceof Error ? error.message : "GHL rejection sync failed.",
        ],
      });
    }

    return NextResponse.json({ success: true, status: "rejected" });
  }

  let userId = application.user_id;

  if (!userId && application.email) {
    const { rows: existingUsers } = await db.query<{ id: string }>({
      text: `
        SELECT id
        FROM users
        WHERE lower(email) = lower($1)
        LIMIT 1
      `,
      values: [application.email],
    });

    if (existingUsers[0]) {
      userId = existingUsers[0].id;

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
  }

  if (userId) {
    await db.query({
      text: `
        UPDATE users
        SET role = $1,
            updated_at = now()
        WHERE id = $2::uuid
      `,
      values: [application.requested_role, userId],
    });
  }

  if (application.requested_role === "agent" && userId) {
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
      values: [userId, applicationId],
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

  try {
    await upsertGhlContact({
      name: application.full_name,
      email: application.email,
      phone: application.phone,
      tags: [
        "Application Approved",
        application.requested_role === "agent" ? "Approved Agent" : "Approved Seller",
      ],
      customFields: {
        application_status: "Approved",
        requested_role: application.requested_role,
        application_type: application.application_type || application.requested_role,
        mm_properties_application_id: application.id,
      },
    });
  } catch (error) {
    await db.query({
      text: `
        UPDATE collaborator_applications
        SET ghl_error = $2,
            updated_at = now()
        WHERE id = $1::uuid
      `,
      values: [
        applicationId,
        error instanceof Error ? error.message : "GHL approval sync failed.",
      ],
    });
  }

  return NextResponse.json({
    success: true,
    status: "approved",
    userId,
    role: application.requested_role,
    accountExists: Boolean(userId),
  });
}