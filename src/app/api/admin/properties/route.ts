import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { findDuplicateListings, resolveDeveloper, syncPropertyPlaces } from "@/lib/taxonomy";

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBool(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function validDavaoPin(lat: number | null, lng: number | null) {
  return lat !== null && lng !== null && lat >= 6.7 && lat <= 7.5 && lng >= 125.2 && lng <= 126;
}

export async function POST(request: NextRequest) {
  const actor = await requireRole(["admin"]);
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const address = String(body.address || "").trim();
  const propertyTypeSlug = String(body.propertyTypeSlug || body.propertyType || "house-and-lot").trim();
  const price = toNumber(body.price);
  const lat = toNumber(body.lat ?? body.latitude);
  const lng = toNumber(body.lng ?? body.longitude);
  const listingIntent = String(body.listingIntent || "sale");
  const availability = String(body.availability || "available");

  if (!title) return NextResponse.json({ error: "Property title is required." }, { status: 400 });
  if (!address) return NextResponse.json({ error: "Address is required." }, { status: 400 });
  if (!price) return NextResponse.json({ error: "Price is required." }, { status: 400 });
  if (!["sale", "rent", "sale_or_rent"].includes(listingIntent)) {
    return NextResponse.json({ error: "Invalid listing offer." }, { status: 400 });
  }
  if (!["available", "reserved", "rented", "sold", "inactive"].includes(availability)) {
    return NextResponse.json({ error: "Invalid availability." }, { status: 400 });
  }
  if (!validDavaoPin(lat, lng)) {
    return NextResponse.json({ error: "Choose a valid map pin in the Davao area before saving." }, { status: 400 });
  }

  const duplicates = await findDuplicateListings({ title, address, price, lat: lat!, lng: lng! });
  if (duplicates.length && !body.allowDuplicate) {
    return NextResponse.json(
      { error: "Possible duplicate listing found.", requiresConfirmation: true, duplicates },
      { status: 409 },
    );
  }

  const developerId = await resolveDeveloper(body.developerName, actor);
  const slug = slugify(title, Date.now().toString(36));

  const { rows } = await db.query<{ id: string; slug: string }>({
    text: `
      INSERT INTO properties (
        title, slug, description, property_type_id, developer_id,
        price, monthly_amortization, downpayment_percent,
        bedrooms, bathrooms, floor_area_sqm, lot_area_sqm, parking_spaces,
        barangay, address, location, is_foreclosed, is_featured, status,
        listing_intent, availability, rent_price, financing_available, assume_balance_available,
        created_at, updated_at
      )
      SELECT
        $1, $2, $3, pt.id, $4::uuid,
        $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, ST_MakePoint($15, $16)::geography, $17, $18, 'active',
        $19, $20, $21, $22, $23,
        now(), now()
      FROM property_types pt
      WHERE pt.slug = $24
      RETURNING id, slug
    `,
    values: [
      title,
      slug,
      String(body.description || "").trim() || null,
      developerId,
      price,
      toNumber(body.monthlyAmortization),
      toNumber(body.downpaymentPercent),
      toNumber(body.bedrooms),
      toNumber(body.bathrooms),
      toNumber(body.floorAreaSqm),
      toNumber(body.lotAreaSqm),
      toNumber(body.parkingSpaces),
      String(body.barangay || "").trim() || null,
      address,
      lng,
      lat,
      toBool(body.isForeclosed),
      toBool(body.isFeatured),
      listingIntent,
      availability,
      toNumber(body.rentPrice),
      toBool(body.financingAvailable),
      toBool(body.assumeBalanceAvailable),
      propertyTypeSlug,
    ],
  });

  if (!rows[0]) {
    return NextResponse.json({ error: "Invalid property type." }, { status: 400 });
  }

  await syncPropertyPlaces(rows[0].id, body.primaryPlace, body.nearbyPlaces, actor);

  return NextResponse.json({ ok: true, id: rows[0].id, slug: rows[0].slug });
}
