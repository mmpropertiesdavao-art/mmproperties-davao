// src/lib/notifications.ts
//
// Placeholder notification dispatch — swap for real email/SMS provider
// (e.g. Resend, Twilio) at implementation time. Kept as a separate module
// so the inquiries route doesn't hardcode a provider.

export async function notifyAgent(agentId: string, inquiryId: string): Promise<void> {
  console.log(`[notify] agent ${agentId} about inquiry ${inquiryId}`);
  // TODO: send email/SMS to the agent, and/or push to an agent dashboard feed
}

export async function notifyAdmin(inquiryId: string): Promise<void> {
  console.log(`[notify] admin about unassigned inquiry ${inquiryId}`);
  // TODO: route to admin queue when a listing has no agent (e.g. seller-direct)
}
