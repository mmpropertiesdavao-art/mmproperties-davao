import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";
import { findDuplicateListings, resolveDeveloper, syncPropertyPlaces } from "@/lib/taxonomy";

type RouteContext = { params: Promise<{ id: string }> };

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

export async function GET(_request: NextRequest, context: RouteContext) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  const { id } = await context.params;

  const { rows } = await db.query({
    text: `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.description,
        pt.slug AS "propertyTypeSlug",
        d.name AS "developerName",
        p.price::float AS price,
        p.monthly_amortization::float AS "monthlyAmortization",
        p.downpayment_percent::float AS "downpaymentPercent",
        p.bedrooms,
        p.bathrooms::float AS bathrooms,
        p.floor_area_sqm::float AS "floorAreaSqm",
        p.lot_area_sqm::float AS "lotAreaSqm",
        p.parking_spaces AS "parkingSpaces",
        p.barangay,
        p.address,
        ST_Y(p.location::geometry)::float AS lat,
        ST_X(p.location::geometry)::float AS lng,
        p.status,
        p.is_foreclosed AS "isForeclosed",
        p.is_featured AS "isFeatured",
        p.listing_intent AS "listingIntent",
        p.availability,
        p.rent_price::float AS "rentPrice",
        p.financing_available AS "financingAvailable",
        p.assume_balance_available AS "assumeBalanceAvailable",
        COALESCE((SELECT pl.name FROM property_places pp JOIN places pl ON pl.id=pp.place_id WHERE pp.property_id=p.id AND pp.relation='primary' LIMIT 1),'') AS "primaryPlace",
        COALESCE((SELECT array_agg(pl.name ORDER BY pp.sort_order) FROM property_places pp JOIN places pl ON pl.id=pp.place_id WHERE pp.property_id=p.id AND pp.relation='nearby'),'{}') AS "nearbyPlaces",
        (SELECT COUNT(*)::int FROM property_images pi WHERE pi.property_id=p.id) AS "photoCount",
        (SELECT COUNT(*)::int FROM property_views pv WHERE pv.property_id=p.id) AS "viewCount",
        (SELECT COUNT(*)::int FROM favorites f WHERE f.property_id=p.id) AS "saveCount",
        (SELECT COUNT(*)::int FROM inquiries i WHERE i.property_id=p.id) AS "inquiryCount"
      FROM properties p
      JOIN property_types pt ON pt.id=p.property_type_id
      LEFT JOIN developers d ON d.id=p.developer_id
      LEFT JOIN agents a ON a.id=p.agent_id
      WHERE p.id=$1::uuid
        AND ($2::text='admin' OR ($2::text='seller' AND p.seller_id=$3::uuid) OR ($2::text='agent' AND a.user_id=$3::uuid))
      LIMIT 1
    `,
    values: [id, actor.role, actor.userId],
  });

  if (!rows[0]) {
    return NextResponse.json({ error: "Listing not found or access denied." }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const actor = await requireRole(["admin"]);
  const { id } = await context.params;
  const rawBody = await request.json().catch(() => null);

  if (!rawBody || typeof rawBody !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const body = rawBody.updates && typeof rawBody.updates === "object" ? rawBody.updates : rawBody;
  const title = String(body.title || "").trim();
  const address = String(body.address || "").trim();
  const propertyTypeSlug = String(body.propertyTypeSlug || body.propertyType || "").trim();
  const price = toNumber(body.price);
  const lat = toNumber(body.lat ?? body.latitude);
  const lng = toNumber(body.lng ?? body.longitude);
  const listingIntent = String(body.listingIntent || "sale");
  const requestedAvailability = String(body.availability || "available");
  const requestedStatus = String(body.status || "active");
  const status = requestedAvailability === "sold" ? "sold" : requestedAvailability === "inactive" ? "inactive" : requestedStatus;
  const availability = status === "sold" ? "sold" : status === "inactive" ? "inactive" : requestedAvailability;

  if (!title) return NextResponse.json({ error: "Property title is required." }, { status: 400 });
  if (!address) return NextResponse.json({ error: "Address is required." }, { status: 400 });
  if (!price) return NextResponse.json({ error: "Price is required." }, { status: 400 });
  if (!propertyTypeSlug) return NextResponse.json({ error: "Property type is required." }, { status: 400 });
  if (!validDavaoPin(lat, lng)) {
    return NextResponse.json({ error: "Choose a valid map pin in the Davao area before saving." }, { status: 400 });
  }
  if (!["sale", "rent", "sale_or_rent"].includes(listingIntent)) {
    return NextResponse.json({ error: "Invalid listing offer." }, { status: 400 });
  }
  if (!["available", "reserved", "rented", "sold", "inactive"].includes(availability)) {
    return NextResponse.json({ error: "Invalid availability." }, { status: 400 });
  }
  if (!["active", "pending", "sold", "inactive"].includes(status)) {
    return NextResponse.json({ error: "Invalid listing status." }, { status: 400 });
  }

  const duplicates = await findDuplicateListings({ title, address, price, lat: lat!, lng: lng! }, id);
  if (duplicates.length && !rawBody.allowDuplicate && !body.allowDuplicate) {
    return NextResponse.json(
      { error: "Possible duplicate listing found.", requiresConfirmation: true, duplicates },
      { status: 409 },
    );
  }

  const developerId = await resolveDeveloper(body.developerName, actor);

  const { rows } = await db.query<{ id: string }>({
    text: `
      UPDATE properties p
      SET
        title=$1,
        description=$2,
        property_type_id=pt.id,
        developer_id=$3::uuid,
        price=$4,
        previous_price=CASE
          WHEN $4::numeric < p.price THEN p.price
          WHEN $4::numeric > p.price THEN NULL
          ELSE p.previous_price
        END,
        price_reduced_at=CASE
          WHEN $4::numeric < p.price THEN now()
          WHEN $4::numeric > p.price THEN NULL
          ELSE p.price_reduced_at
        END,
        monthly_amortization=$5,
        downpayment_percent=$6,
        bedrooms=$7,
        bathrooms=$8,
        floor_area_sqm=$9,
        lot_area_sqm=$10,
        parking_spaces=$11,
        barangay=$12,
        address=$13,
        location=ST_MakePoint($14,$15)::geography,
        is_foreclosed=$16,
        is_featured=$17,
        status=$18,
        listing_intent=$19,
        availability=$20,
        rent_price=$21,
        financing_available=$22,
        assume_balance_available=$23,
        updated_at=now()
      FROM property_types pt
      WHERE p.id=$24::uuid AND pt.slug=$25
      RETURNING p.id
    `,
    values: [
      title,
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
      status,
      listingIntent,
      availability,
      toNumber(body.rentPrice),
      toBool(body.financingAvailable),
      toBool(body.assumeBalanceAvailable),
      id,
      propertyTypeSlug,
    ],
  });

  if (!rows[0]) {
    return NextResponse.json({ error: "Listing not found or property type is invalid." }, { status: 404 });
  }

  await syncPropertyPlaces(id, body.primaryPlace, body.nearbyPlaces, actor);

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  await requireRole(["admin"]);
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const mode = String(body.mode || "archive");

  const { rows: existing } = await db.query<{ title: string }>({
    text: `SELECT title FROM properties WHERE id=$1::uuid LIMIT 1`,
    values: [id],
  });

  if (!existing[0]) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (mode === "permanent") {
    if (String(body.confirmation || "") !== existing[0].title) {
      return NextResponse.json({ error: "Confirmation text does not match the listing title." }, { status: 400 });
    }

    await db.query({ text: `DELETE FROM properties WHERE id=$1::uuid`, values: [id] });
    return NextResponse.json({ ok: true, deleted: true });
  }

  await db.query({
    text: `
      UPDATE properties
      SET status='inactive',
          availability='inactive',
          archived_at=now(),
          archive_reason=COALESCE(NULLIF($2,''),'Archived from admin listing editor'),
          updated_at=now()
      WHERE id=$1::uuid
    `,
    values: [id, body.reason || null],
  });

  return NextResponse.json({ ok: true, archived: true });
}
