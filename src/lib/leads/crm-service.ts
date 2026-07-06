import { upsertGhlContact } from "@/lib/ghl";
import type { LeadInput } from "@/lib/leads/validation";

export async function syncLeadToCrm(lead: LeadInput) {
  if (process.env.GHL_PRIVATE_INTEGRATION_TOKEN && process.env.GHL_LOCATION_ID) {
    return upsertGhlContact({
      name: lead.fullName,
      email: lead.email,
      phone: lead.mobile,
      tags: ["MM Properties Website", lead.leadType.replace(/_/g, " ")],
      customFields: {
        lead_type: lead.leadType,
        preferred_location: lead.preferredLocation,
        budget: lead.budget,
        buying_timeline: lead.buyingTimeline,
        property_type: lead.propertyType,
        source_page: lead.sourcePage,
      },
    });
  }

  return {
    skipped: true,
    reason: "No CRM provider configured.",
  };
}
