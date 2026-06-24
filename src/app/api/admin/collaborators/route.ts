import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

export async function GET() {
  const actor = await requireRole(["admin"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { rows } = await db.query({
    text: `
      SELECT ca.id, ca.user_id AS "userId", u.email, u.full_name AS "fullName", u.phone,
        ca.requested_role AS "requestedRole", ca.business_name AS "businessName",
        ca.prc_license_number AS "prcLicenseNumber", ca.profession, ca.service_area AS "serviceArea",ca.consent_confirmed AS "consentConfirmed", ca.message, ca.status,
        ca.created_at AS "createdAt"
      FROM collaborator_applications ca
      JOIN users u ON u.id = ca.user_id
      ORDER BY CASE ca.status WHEN 'pending' THEN 0 ELSE 1 END, ca.created_at DESC
    `,
    values: [],
  });
  return NextResponse.json(rows);
}

export async function PATCH(request: NextRequest) {
  const actor = await requireRole(["admin"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const body = await request.json();
  const applicationId = String(body.applicationId ?? "");
  const action = String(body.action ?? "");
  if (!applicationId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Choose an application and a valid action." }, { status: 400 });
  }

  const { rows: applications } = await db.query<{ user_id: string; requested_role: "seller" | "agent"; status: string }>({
    text: `SELECT user_id, requested_role, status FROM collaborator_applications WHERE id = $1::uuid LIMIT 1`,
    values: [applicationId],
  });
  const application = applications[0];
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (application.status !== "pending") return NextResponse.json({ error: "This application has already been reviewed." }, { status: 409 });

  if (action === "approve") {
    await db.query({
      text: `UPDATE users SET role = $1, updated_at = now() WHERE id = $2::uuid`,
      values: [application.requested_role, application.user_id],
    });
  }

  await db.query({
    text: `UPDATE collaborator_applications SET status = $1, reviewed_at = now() WHERE id = $2::uuid`,
    values: [action === "approve" ? "approved" : "rejected", applicationId],
  });

  return NextResponse.json({ success: true, status: action === "approve" ? "approved" : "rejected" });
}
