export const dynamic = "force-dynamic";

// src/app/api/applications/route.ts
//
// Public application intake for sellers, agents, and collaborators.
// Saves to Supabase/Postgres first, then optionally sends the same payload
// to a GoHighLevel webhook if GHL_APPLICATION_WEBHOOK_URL is configured.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type ApplicationType = "seller" | "agent" | "collaborator";

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeApplicationType(value: unknown): ApplicationType | null {
  if (value === "seller" || value === "agent" || value === "collaborator") {
    return value;
  }
  return null;
}

function requestedRoleFor(type: ApplicationType): "seller" | "agent" {
  if (type === "agent") return "agent";
  return "seller";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const applicationType = normalizeApplicationType(body.applicationType ?? body.application_type);
    const fullName = clean(body.fullName ?? body.full_name);
    const email = clean(body.email)?.toLowerCase() ?? null;
    const phone = clean(body.phone);
    const businessName = clean(body.businessName ?? body.business_name);
    const prcLicenseNumber = clean(body.prcLicenseNumber ?? body.prc_license_number);
    const profession = clean(body.profession);
    const serviceArea = clean(body.serviceArea ?? body.service_area);
    const propertyAddress = clean(body.propertyAddress ?? body.property_address);
    const propertyType = clean(body.propertyType ?? body.property_type);
    const message = clean(body.message);
    const isPropertyOwner = Boolean(body.isPropertyOwner ?? body.is_property_owner);
    const consentConfirmed = Boolean(body.consentConfirmed ?? body.consent_confirmed);

    if (!applicationType) {
      return NextResponse.json(
        { error: "Choose seller, agent, or collaborator." },
        { status: 400 }
      );
    }

    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Full name, email, and phone are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (!consentConfirmed) {
      return NextResponse.json(
        { error: "Consent is required before submitting the application." },
        { status: 400 }
      );
    }

    if (applicationType === "seller" && !isPropertyOwner) {
      return NextResponse.json(
        { error: "Seller applications are only for property owners." },
        { status: 400 }
      );
    }

    if (applicationType === "agent" && !prcLicenseNumber) {
      return NextResponse.json(
        { error: "PRC license number is required for agent applications." },
        { status: 400 }
      );
    }

    const requestedRole = requestedRoleFor(applicationType);

    const { rows } = await db.query<{
      id: string;
      created_at: string;
    }>({
      text: `
        INSERT INTO collaborator_applications (
          user_id,
          requested_role,
          application_type,
          full_name,
          email,
          phone,
          business_name,
          prc_license_number,
          profession,
          service_area,
          property_address,
          is_property_owner,
          property_type,
          message,
          consent_confirmed,
          status,
          source,
          created_at,
          updated_at
        )
        VALUES (
          NULL,
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          'pending',
          'website',
          now(),
          now()
        )
        RETURNING id, created_at
      `,
      values: [
        requestedRole,
        applicationType,
        fullName,
        email,
        phone,
        businessName,
        prcLicenseNumber,
        profession,
        serviceArea,
        propertyAddress,
        isPropertyOwner,
        propertyType,
        message,
        consentConfirmed,
      ],
    });

    const application = rows[0];

    const ghlWebhookUrl = process.env.GHL_APPLICATION_WEBHOOK_URL;

    if (ghlWebhookUrl) {
      try {
        const ghlResponse = await fetch(ghlWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "MM Properties Website",
            event: "application_submitted",
            applicationId: application.id,
            applicationType,
            requestedRole,
            fullName,
            email,
            phone,
            businessName,
            prcLicenseNumber,
            profession,
            serviceArea,
            propertyAddress,
            isPropertyOwner,
            propertyType,
            message,
            consentConfirmed,
            createdAt: application.created_at,
            tags: [
              "MM Properties Application",
              applicationType === "seller"
                ? "Seller Applicant"
                : applicationType === "agent"
                  ? "Agent Applicant"
                  : "Collaborator Applicant",
            ],
          }),
        });

        if (ghlResponse.ok) {
          await db.query({
            text: `
              UPDATE collaborator_applications
              SET ghl_sent_at = now(), ghl_error = NULL, updated_at = now()
              WHERE id = $1::uuid
            `,
            values: [application.id],
          });
        } else {
          const errorText = await ghlResponse.text().catch(() => "");
          await db.query({
            text: `
              UPDATE collaborator_applications
              SET ghl_error = $2, updated_at = now()
              WHERE id = $1::uuid
            `,
            values: [
              application.id,
              `GHL webhook failed with status ${ghlResponse.status}: ${errorText.slice(0, 500)}`,
            ],
          });
        }
      } catch (error) {
        await db.query({
          text: `
            UPDATE collaborator_applications
            SET ghl_error = $2, updated_at = now()
            WHERE id = $1::uuid
          `,
          values: [
            application.id,
            error instanceof Error ? error.message : "GHL webhook failed.",
          ],
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: application.id,
        status: "pending",
        message: "Application submitted successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Application submission failed", error);
    return NextResponse.json(
      { error: "Could not submit application. Please try again." },
      { status: 500 }
    );
  }
}