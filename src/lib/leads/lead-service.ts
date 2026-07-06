import type { NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
import { notifyAdminLead, sendLeadWelcomeEmail } from "@/lib/leads/email-service";
import { queueLeadDripEmails } from "@/lib/leads/drip-service";
import { syncLeadToCrm } from "@/lib/leads/crm-service";
import { getClientIp } from "@/lib/leads/spam";
import type { LeadInput } from "@/lib/leads/validation";

export async function createLead(input: LeadInput, request: NextRequest, recaptchaScore?: number | null) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || null;

  const { rows } = await db.query<{ id: string }>({
    text: `
      INSERT INTO leads(
        full_name, email, mobile, lead_type, property_type, preferred_location, budget,
        buying_timeline, property_id, property_title, listing_price, listing_url,
        property_address, lot_area, floor_area, reason_for_selling, message,
        source_page, traffic_source, ip_address, user_agent, recaptcha_score
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, NULLIF($9, '')::uuid, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22
      )
      RETURNING id
    `,
    values: [
      input.fullName,
      input.email,
      input.mobile,
      input.leadType,
      input.propertyType,
      input.preferredLocation,
      input.budget,
      input.buyingTimeline,
      input.propertyId,
      input.propertyTitle,
      input.listingPrice,
      input.listingUrl,
      input.propertyAddress,
      input.lotArea,
      input.floorArea,
      input.reasonForSelling,
      input.message,
      input.sourcePage,
      input.trafficSource,
      ip,
      userAgent,
      recaptchaScore,
    ],
  });

  const leadId = rows[0]?.id;
  if (!leadId) throw new Error("Lead could not be created.");

  await queueLeadDripEmails(leadId);
  await Promise.allSettled([
    sendLeadWelcomeEmail(input),
    notifyAdminLead(input),
    syncLeadToCrm(input),
  ]);

  return { id: leadId };
}

export async function createLeadFromPropertyInquiry({
  request,
  propertyId,
  name,
  email,
  phone,
  message,
}: {
  request: NextRequest;
  propertyId: string;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
}) {
  const { rows } = await db.query<{ title: string | null; price: string | null; slug: string | null; address: string | null; barangay: string | null; property_type: string | null }>({
    text: "SELECT title, price::text, slug, address, barangay, property_type FROM properties WHERE id = $1::uuid",
    values: [propertyId],
  });
  const property = rows[0];

  return createLead(
    {
      fullName: name,
      email,
      mobile: phone || "",
      leadType: "property_inquiry",
      propertyId,
      propertyTitle: property?.title || null,
      listingPrice: property?.price ? Number(property.price) : null,
      listingUrl: property?.slug ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://mmpropertiesdavao.com"}/property/${property.slug}` : null,
      propertyAddress: [property?.address, property?.barangay, "Davao City"].filter(Boolean).join(", "),
      propertyType: property?.property_type || null,
      message,
      sourcePage: request.headers.get("referer") || null,
    },
    request,
  );
}
