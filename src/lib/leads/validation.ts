export const LEAD_STATUSES = ["new", "contacted", "qualified", "closed", "lost"] as const;
export const LEAD_TYPES = ["buyer", "seller", "property_inquiry", "developer_project", "mm_pulse", "general"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadType = (typeof LEAD_TYPES)[number];

export type LeadInput = {
  fullName: string;
  email: string;
  mobile: string;
  leadType: LeadType;
  propertyType?: string | null;
  preferredLocation?: string | null;
  budget?: string | null;
  buyingTimeline?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
  listingPrice?: number | null;
  listingUrl?: string | null;
  propertyAddress?: string | null;
  lotArea?: string | null;
  floorArea?: string | null;
  reasonForSelling?: string | null;
  message?: string | null;
  sourcePage?: string | null;
  trafficSource?: string | null;
  recaptchaToken?: string | null;
  website?: string | null;
};

export function clean(value: unknown, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function nullableClean(value: unknown, maxLength = 500) {
  const text = clean(value, maxLength);
  return text || null;
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeLeadInput(body: Record<string, unknown>): LeadInput {
  const leadType = clean(body.leadType || body.lead_type || "buyer") as LeadType;
  const normalized: LeadInput = {
    fullName: clean(body.fullName || body.full_name, 120),
    email: clean(body.email, 160).toLowerCase(),
    mobile: clean(body.mobile || body.phone, 50),
    leadType: LEAD_TYPES.includes(leadType) ? leadType : "general",
    propertyType: nullableClean(body.propertyType || body.property_type, 80),
    preferredLocation: nullableClean(body.preferredLocation || body.preferred_location, 160),
    budget: nullableClean(body.budget, 80),
    buyingTimeline: nullableClean(body.buyingTimeline || body.buying_timeline, 80),
    propertyId: nullableClean(body.propertyId || body.property_id, 80),
    propertyTitle: nullableClean(body.propertyTitle || body.property_title, 220),
    listingPrice: body.listingPrice || body.listing_price ? Number(body.listingPrice || body.listing_price) : null,
    listingUrl: nullableClean(body.listingUrl || body.listing_url, 500),
    propertyAddress: nullableClean(body.propertyAddress || body.property_address, 300),
    lotArea: nullableClean(body.lotArea || body.lot_area, 80),
    floorArea: nullableClean(body.floorArea || body.floor_area, 80),
    reasonForSelling: nullableClean(body.reasonForSelling || body.reason_for_selling, 220),
    message: nullableClean(body.message, 2000),
    sourcePage: nullableClean(body.sourcePage || body.source_page, 500),
    trafficSource: nullableClean(body.trafficSource || body.traffic_source, 220),
    recaptchaToken: nullableClean(body.recaptchaToken || body.recaptcha_token, 1000),
    website: nullableClean(body.website, 200),
  };

  return normalized;
}

export function validateLeadInput(input: LeadInput) {
  const errors: Record<string, string> = {};

  if (!input.fullName) errors.fullName = "Full name is required.";
  if (!input.email) errors.email = "Email address is required.";
  else if (!isEmail(input.email)) errors.email = "Enter a valid email address.";
  if (!input.mobile) errors.mobile = "Mobile number is required.";

  if (input.leadType === "buyer") {
    if (!input.preferredLocation) errors.preferredLocation = "Preferred location is required.";
    if (!input.budget) errors.budget = "Budget is required.";
    if (!input.propertyType) errors.propertyType = "Property type is required.";
    if (!input.buyingTimeline) errors.buyingTimeline = "Buying timeline is required.";
  }

  if (input.leadType === "seller") {
    if (!input.propertyAddress) errors.propertyAddress = "Property address is required.";
    if (!input.propertyType) errors.propertyType = "Property type is required.";
  }

  return errors;
}
