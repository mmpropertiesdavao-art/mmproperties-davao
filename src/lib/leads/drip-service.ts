import { db } from "@/lib/supabase/server";

const DRIP_STEPS = [
  { days: 0, key: "welcome", subject: "Welcome to MM Properties Davao" },
  { days: 3, key: "buying_tips", subject: "Top 5 Tips Before Buying Property in Davao" },
  { days: 7, key: "featured_properties", subject: "Featured Properties Based on Your Interests" },
  { days: 14, key: "financing_guide", subject: "Financing Guide: Pag-IBIG, Bank Financing, and Cash Purchase" },
  { days: 21, key: "success_stories", subject: "Client Success Stories" },
  { days: 30, key: "free_consultation", subject: "Schedule a Free Property Consultation" },
];

export async function queueLeadDripEmails(leadId: string) {
  try {
    for (const step of DRIP_STEPS) {
      await db.query({
        text: `
          INSERT INTO lead_drip_queue(lead_id, email_key, subject, scheduled_for)
          VALUES ($1::uuid, $2, $3, now() + ($4::int * interval '1 day'))
        `,
        values: [leadId, step.key, step.subject, step.days],
      });
    }
  } catch (error) {
    console.warn("Could not queue lead drip emails", error);
  }
}
