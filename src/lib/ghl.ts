// src/lib/ghl.ts
//
// GoHighLevel / LeadConnector integration.
// Creates or updates contacts and applies tags so GHL workflows can trigger.

type GhlContactInput = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  tags?: string[];
  customFields?: Record<string, string | null | undefined>;
};

function splitName(name?: string | null) {
  const clean = name?.trim();
  if (!clean) return { firstName: undefined, lastName: undefined };

  const parts = clean.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: undefined };

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export async function upsertGhlContact(input: GhlContactInput) {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    return {
      skipped: true,
      reason: "GHL_PRIVATE_INTEGRATION_TOKEN or GHL_LOCATION_ID is missing.",
    };
  }

  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.trim();

  if (!email && !phone) {
    return {
      skipped: true,
      reason: "No email or phone provided for GHL contact.",
    };
  }

  const nameParts = splitName(input.name);
  const tags = Array.from(new Set((input.tags || []).filter(Boolean)));

  const payload: Record<string, unknown> = {
    locationId,
    email,
    phone,
    firstName: input.firstName || nameParts.firstName,
    lastName: input.lastName || nameParts.lastName,
    name: input.name || undefined,
    tags,
    source: "MM Properties Website",
  };

  if (input.customFields && Object.keys(input.customFields).length > 0) {
    payload.customFields = Object.entries(input.customFields)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
      .map(([key, value]) => ({
        key,
        field_value: String(value),
      }));
  }

  const response = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `GHL contact upsert failed (${response.status}): ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`
    );
  }

  return {
    skipped: false,
    data,
  };
}