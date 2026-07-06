import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/leads/lead-service";
import { checkLeadRateLimit, getClientIp, isAllowedOrigin, verifyRecaptcha } from "@/lib/leads/spam";
import { normalizeLeadInput, validateLeadInput } from "@/lib/leads/validation";
import { sendMetaLeadEvent } from "@/lib/meta-capi";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Invalid submission origin." }, { status: 403 });
  }

  const input = normalizeLeadInput(body as Record<string, unknown>);

  if (input.website) {
    return NextResponse.json({ error: "Submission rejected." }, { status: 400 });
  }

  const errors = validateLeadInput(input);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Please check the required fields.", errors }, { status: 400 });
  }

  const rateLimitOk = await checkLeadRateLimit(`${getClientIp(request)}:${input.email}`);
  if (!rateLimitOk) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  const recaptcha = await verifyRecaptcha(input.recaptchaToken);
  if (!recaptcha.ok) {
    return NextResponse.json({ error: "Spam check failed. Please try again." }, { status: 400 });
  }

  try {
    const lead = await createLead(input, request, recaptcha.score);
    await sendMetaLeadEvent({
      request,
      eventId: `lead-${lead.id}`,
      email: input.email,
      phone: input.mobile,
      name: input.fullName,
      contentName: input.leadType,
      contentIds: input.propertyId ? [input.propertyId] : undefined,
    });
    return NextResponse.json({ id: lead.id, status: "new" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save lead.";
    const migrationHint = message.includes("relation") && message.includes("leads")
      ? "Run database/lead_capture_drip.sql in Supabase first."
      : undefined;
    return NextResponse.json({ error: migrationHint || message }, { status: 500 });
  }
}
