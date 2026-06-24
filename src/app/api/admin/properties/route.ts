import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";
import { slugify } from "@/lib/slugify";
import { requireRole } from "@/lib/auth/requireRole";
import { findDuplicateListings, resolveDeveloper, syncPropertyPlaces } from "@/lib/taxonomy";

const LISTING_INTENTS = new Set(["sale", "rent", "sale_or_rent"]);
const AVAILABILITY = new Set(["available", "reserved", "rented", "sold", "inactive"]);

export async function POST(req: NextRequest) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    description,
    propertyTypeSlug,
    developerName,
    price,
    monthlyAmortization,
    downpaymentPercent,
    bedrooms,
    bathrooms,
    floorAreaSqm,
    lotAreaSqm,
    parkingSpaces,
    neighborhoodSlug,
    barangay,
    address,
    lat,
    lng,
    isForeclosed,
    isFeatured,
    listingIntent = "sale",
    availability = "available",
    rentPrice,
    financingAvailable,
    assumeBalanceAvailable,
    photoUrls,
    primaryPlace,
    nearbyPlaces,
    allowDuplicate,
  } = body;

  if (!title || !price || !address || !propertyTypeSlug) {
    return NextResponse.json({ error: "title, price, address, and propertyTypeSlug are required" }, { status: 400 });
  }
  if (!LISTING_INTENTS.has(listingIntent) || !AVAILABILITY.has(availability)) {
    return NextResponse.json({ error: "Choose a valid listing offer and availability." }, { status: 400 });
  }
  if ((listingIntent === "rent" || listingIntent === "sale_or_rent") && (!Number.isFinite(Number(rentPrice)) || Number(rentPrice) <= 0)) {
    return NextResponse.json({ error: "Enter the monthly rent for rental listings." }, { status: 400 });
  }

  const manualPin = parseManualPin(lat, lng);
  const geocoded = manualPin ? null : await geocodeAddress(address);
  const location = manualPin ?? geocoded;

  if (!location) {
    return NextResponse.json({ error: "Could not locate that address on the map. Please place the map pin manually." }, { status: 422 });
  }

  const slug = slugify(title, Date.now().toString(36));
  const duplicates = await findDuplicateListings({ title:String(title), address:String(address), price:Number(price), lat:location.lat, lng:location.lng });
  if (duplicates.length && !allowDuplicate) return NextResponse.json({ error:"This looks similar to an existing listing. Review it before creating a duplicate.", duplicates, requiresConfirmation:true }, { status:409 });
  const developerId = await resolveDeveloper(developerName, actor);

  const { rows } = await db.query({
    text: `
      INSERT INTO properties (
        title, slug, description, property_type_id, developer_id, agent_id, seller_id,
        price, monthly_amortization, downpayment_percent,
        bedrooms, bathrooms, floor_area_sqm, lot_area_sqm, parking_spaces,
        neighborhood_id, barangay, address, location, is_foreclosed, is_featured,
        listing_intent, availability, rent_price, financing_available, assume_balance_available
      )
      SELECT
        $1, $2, $3, pt.id,
        $28::uuid,
        CASE WHEN $20 = 'agent' THEN (SELECT id FROM agents WHERE user_id = $19 LIMIT 1) ELSE NULL END,
        CASE WHEN $20 = 'seller' THEN $19::uuid ELSE NULL END,
        $5, $6, $7, $8, $9, $10, $11, $27,
        (SELECT id FROM neighborhoods WHERE slug = $12 LIMIT 1),
        $13, $14,
        ST_MakePoint($15, $16)::geography,
        $17, $18, $22, $23, $24, $25, $26
      FROM property_types pt WHERE pt.slug = $21
      RETURNING id, slug
    `,
    values: [
      title,
      slug,
      description ?? null,
      developerName ?? null,
      price,
      monthlyAmortization ?? null,
      downpaymentPercent ?? null,
      bedrooms ?? null,
      bathrooms ?? null,
      floorAreaSqm ?? null,
      lotAreaSqm ?? null,
      neighborhoodSlug ?? null,
      barangay ?? null,
      address,
      location.lng,
      location.lat,
      Boolean(isForeclosed),
      Boolean(isFeatured),
      actor.userId,
      actor.role,
      propertyTypeSlug,
      listingIntent,
      availability,
      rentPrice ? Number(rentPrice) : null,
      Boolean(financingAvailable),
      Boolean(assumeBalanceAvailable),
      parkingSpaces ?? null,
      developerId,
    ],
  });

  const property = rows[0];
  if (!property) {
    return NextResponse.json({ error: "Could not create listing. Check that the property type is valid." }, { status: 400 });
  }

  if (Array.isArray(photoUrls) && photoUrls.length > 0) {
    await db.query({
      text: `
        INSERT INTO property_images (property_id, url, sort_order, is_cover)
        SELECT $1, url, idx, idx = 0
        FROM unnest($2::text[]) WITH ORDINALITY AS t(url, idx0)
        CROSS JOIN LATERAL (SELECT idx0 - 1 AS idx) o
      `,
      values: [property.id, photoUrls],
    });
  }
  await syncPropertyPlaces(property.id, primaryPlace, nearbyPlaces, actor);

  return NextResponse.json(
    {
      id: property.id,
      slug: property.slug,
      geocodeConfidence: manualPin ? "manual" : geocoded?.confidence,
      message:
        manualPin
          ? "Listing created with the exact map pin."
          : geocoded?.confidence === "low"
          ? "Listing created, but the map pin location is approximate. Consider placing the pin manually."
          : "Listing created.",
    },
    { status: 201 },
  );
}

function parseManualPin(lat: unknown, lng: unknown): { lat: number; lng: number; confidence: "manual" } | null {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;

  const isNearDavao = parsedLat >= 6.7 && parsedLat <= 7.5 && parsedLng >= 125.2 && parsedLng <= 126;
  if (!isNearDavao) return null;

  return { lat: parsedLat, lng: parsedLng, confidence: "manual" };
}
