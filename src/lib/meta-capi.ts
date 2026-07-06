import { createHash } from "crypto";
import type { NextRequest } from "next/server";

const META_PIXEL_ID = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const META_CAPI_TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE;
const GRAPH_VERSION = process.env.META_CAPI_GRAPH_VERSION || "v20.0";

function sha256(value?: unknown) {
  const cleaned = String(value || "").trim().toLowerCase();
  return cleaned ? createHash("sha256").update(cleaned).digest("hex") : undefined;
}

function firstName(value?: unknown) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function lastName(value?: unknown) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

export async function sendMetaLeadEvent({
  request,
  eventName = "Lead",
  eventId,
  email,
  phone,
  name,
  contentName,
  contentIds,
}: {
  request: NextRequest;
  eventName?: string;
  eventId: string;
  email?: unknown;
  phone?: unknown;
  name?: unknown;
  contentName?: string;
  contentIds?: string[];
}) {
  if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) return;

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: request.headers.get("referer") || process.env.NEXT_PUBLIC_SITE_URL || "https://mmpropertiesdavao.com",
        user_data: {
          em: sha256(email),
          ph: sha256(phone),
          fn: sha256(firstName(name)),
          ln: sha256(lastName(name)),
          client_ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          client_user_agent: request.headers.get("user-agent") || undefined,
          fbp: request.cookies.get("_fbp")?.value,
          fbc: request.cookies.get("_fbc")?.value,
        },
        custom_data: {
          content_name: contentName,
          content_ids: contentIds,
        },
      },
    ],
    ...(META_CAPI_TEST_EVENT_CODE ? { test_event_code: META_CAPI_TEST_EVENT_CODE } : {}),
  };

  try {
    await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${META_CAPI_ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("Meta CAPI lead event failed", error);
  }
}
