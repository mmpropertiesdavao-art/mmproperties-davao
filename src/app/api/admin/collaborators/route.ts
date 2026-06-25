export const dynamic = "force-dynamic";

// src/app/api/admin/collaborators/route.ts
//
// Admin review API for seller, agent, and collaborator applications.
// Supports both old account-based applications and new public form-based
// applications where user_id can be null.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

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
    user_id: string | null;
    requested_role: RequestedRole;
    status: string;
    email: string | null;
    full_name: string | null;
  }>({
    text: `
      SELECT
        user_id,
        requested_role,
        status,
        email,
        full_name
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

  // Approval requires a user account because role access lives in users.role.
  // Public form applications can be reviewed first, but account creation/invite
  // will be handled in the next implementation step.
  if (!application.user_id) {
    return NextResponse.json(
      {
        error:
          "This applicant does not have a user account yet. Keep it pending for now. Next step will add account invite/creation before approval.",
      },
      { status: 409 }
    );
  }

  await db.query({
    text: `
      UPDATE users
      SET role = $1,
          updated_at = now()
      WHERE id = $2::uuid
    `,
    values: [application.requested_role, application.user_id],
  });

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

  return NextResponse.json({ success: true, status: "approved" });
}