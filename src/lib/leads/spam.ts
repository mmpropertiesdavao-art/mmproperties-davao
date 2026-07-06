import type { NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function checkLeadRateLimit(identity: string, maxSubmissions = 5, windowMinutes = 15) {
  const key = identity || "unknown";

  try {
    await db.query({
      text: "INSERT INTO lead_rate_limits(identity_key) VALUES ($1)",
      values: [key],
    });

    const { rows } = await db.query<{ count: string }>({
      text: `
        SELECT count(*)::text
        FROM lead_rate_limits
        WHERE identity_key = $1
        AND created_at > now() - ($2::int * interval '1 minute')
      `,
      values: [key, windowMinutes],
    });

    return Number(rows[0]?.count || 0) <= maxSubmissions;
  } catch {
    // If the optional rate-limit table has not been migrated yet, avoid blocking
    // real leads. Honeypot + validation still protect the endpoint.
    return true;
  }
}

export async function verifyRecaptcha(token?: string | null) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return { ok: true, score: null as number | null };

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await response.json();
    const score = typeof data.score === "number" ? data.score : null;
    return { ok: Boolean(data.success) && (score === null || score >= 0.4), score };
  } catch {
    return { ok: true, score: null };
  }
}

export function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://mmpropertiesdavao.com";
  try {
    const originHost = new URL(origin).host;
    const siteHost = new URL(site).host;
    return originHost === siteHost || originHost === "localhost:3000" || originHost.startsWith("localhost:");
  } catch {
    return false;
  }
}
