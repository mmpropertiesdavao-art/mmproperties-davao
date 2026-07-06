import type { LeadInput } from "@/lib/leads/validation";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://mmpropertiesdavao.com";
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEADS_EMAIL_FROM || "MM Properties <noreply@mmpropertiesdavao.com>";
  if (!apiKey || !to) return { skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email failed (${response.status}): ${text}`);
  }

  return { skipped: false };
}

export async function sendLeadWelcomeEmail(lead: LeadInput) {
  return sendEmail({
    to: lead.email,
    subject: "Welcome to MM Properties Davao",
    html: `
      <p>Hi ${lead.fullName},</p>
      <p>Thank you for contacting MM Properties Davao. Your request has been received.</p>
      <p>One of our property consultants will review your details and contact you shortly.</p>
      <p>You can continue browsing here: <a href="${siteUrl()}">${siteUrl()}</a></p>
      <p>MM Properties Davao</p>
    `,
  });
}

export async function notifyAdminLead(lead: LeadInput) {
  const adminEmail = process.env.LEADS_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  if (!adminEmail) return { skipped: true };

  return sendEmail({
    to: adminEmail,
    subject: `New ${lead.leadType.replace(/_/g, " ")} lead: ${lead.fullName}`,
    html: `
      <h2>New lead submitted</h2>
      <p><strong>Name:</strong> ${lead.fullName}</p>
      <p><strong>Mobile:</strong> ${lead.mobile}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Budget:</strong> ${lead.budget || "Not provided"}</p>
      <p><strong>Timeline:</strong> ${lead.buyingTimeline || "Not provided"}</p>
      <p><strong>Source page:</strong> ${lead.sourcePage || "Not provided"}</p>
      <p><strong>Message:</strong><br>${lead.message || "No message"}</p>
    `,
  });
}
