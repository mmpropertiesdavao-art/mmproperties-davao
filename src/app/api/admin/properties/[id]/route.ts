import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";
import { findDuplicateListings, resolveDeveloper, syncPropertyPlaces } from "@/lib/taxonomy";
import { createClient } from "@supabase/supabase-js";

const storage=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);

const PROPERTY_TYPES = new Set(["house-and-lot", "condominium", "lot-only", "commercial", "townhouse", "foreclosed"]);
const STATUSES = new Set(["active", "pending", "sold", "inactive"]);
const LISTING_INTENTS = new Set(["sale", "rent", "sale_or_rent"]);
const AVAILABILITY = new Set(["available", "reserved", "rented", "sold", "inactive"]);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const { id } = await params;

  const { rows } = await db.query({
    text: `
      SELECT p.id, p.slug, p.title, p.description,
        pt.slug AS "propertyTypeSlug", d.name AS "developerName",
        p.price::float AS price, p.monthly_amortization::float AS "monthlyAmortization",
        p.downpayment_percent::float AS "downpaymentPercent", p.bedrooms,
        p.bathrooms::float AS bathrooms, p.floor_area_sqm::float AS "floorAreaSqm",
        p.lot_area_sqm::float AS "lotAreaSqm", p.parking_spaces AS "parkingSpaces", n.slug AS "neighborhoodSlug",
        p.barangay, p.address, ST_Y(p.location::geometry) AS lat,
        ST_X(p.location::geometry) AS lng, p.status,
        p.is_foreclosed AS "isForeclosed", p.is_featured AS "isFeatured"
        ,p.listing_intent AS "listingIntent", p.availability,
        p.rent_price::float AS "rentPrice", p.financing_available AS "financingAvailable",
        p.assume_balance_available AS "assumeBalanceAvailable", p.previous_price::float AS "previousPrice"
        ,(SELECT pl.name FROM property_places pp JOIN places pl ON pl.id=pp.place_id WHERE pp.property_id=p.id AND pp.relation='primary' LIMIT 1) AS "primaryPlace"
        ,COALESCE((SELECT array_agg(pl.name ORDER BY pp.sort_order) FROM property_places pp JOIN places pl ON pl.id=pp.place_id WHERE pp.property_id=p.id AND pp.relation='nearby'),'{}') AS "nearbyPlaces"
        ,(SELECT count(*)::int FROM property_images i WHERE i.property_id=p.id) AS "photoCount"
        ,(SELECT count(*)::int FROM property_views v WHERE v.property_id=p.id) AS "viewCount"
        ,(SELECT count(*)::int FROM favorites f WHERE f.property_id=p.id) AS "saveCount"
        ,(SELECT count(*)::int FROM inquiries q WHERE q.property_id=p.id) AS "inquiryCount"
      FROM properties p
      JOIN property_types pt ON pt.id = p.property_type_id
      LEFT JOIN developers d ON d.id = p.developer_id
      LEFT JOIN neighborhoods n ON n.id = p.neighborhood_id
      LEFT JOIN agents a ON a.id = p.agent_id
      WHERE p.id = $1::uuid
        AND ($2 = 'admin' OR ($2 = 'seller' AND p.seller_id = $3::uuid) OR ($2 = 'agent' AND a.user_id = $3::uuid))
      LIMIT 1
    `,
    values: [id, actor.role, actor.userId],
  });

  if (!rows[0]) return NextResponse.json({ error: "Listing not found or access denied." }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  const title = String(body.title ?? "").trim();
  const address = String(body.address ?? "").trim();
  const propertyTypeSlug = String(body.propertyTypeSlug ?? "");
  const status = String(body.status ?? "active");
  const price = Number(body.price);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const listingIntent = String(body.listingIntent ?? "sale");
  const availability = String(body.availability ?? "available");

  if (!title || !address || !PROPERTY_TYPES.has(propertyTypeSlug) || !STATUSES.has(status) || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Complete the title, property type, price, address, and status." }, { status: 400 });
  }
  if (!LISTING_INTENTS.has(listingIntent) || !AVAILABILITY.has(availability)) {
    return NextResponse.json({ error: "Choose a valid listing offer and availability." }, { status: 400 });
  }
  if ((listingIntent === "rent" || listingIntent === "sale_or_rent") && (!Number.isFinite(Number(body.rentPrice)) || Number(body.rentPrice) <= 0)) {
    return NextResponse.json({ error: "Enter the monthly rent for rental listings." }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 6.7 || lat > 7.5 || lng < 125.2 || lng > 126) {
    return NextResponse.json({ error: "Choose a valid map pin in the Davao area." }, { status: 400 });
  }
  const duplicates=await findDuplicateListings({title,address,price,lat,lng},id);
  if(duplicates.length&&!body.allowDuplicate)return NextResponse.json({error:"Possible duplicate found. Review before saving.",duplicates,requiresConfirmation:true},{status:409});
  const developerId=await resolveDeveloper(body.developerName,actor);

  const values = [
    title, body.description || null, propertyTypeSlug, body.developerName || null,
    price, listingIntent, availability, optionalNumber(body.rentPrice),
    Boolean(body.financingAvailable), Boolean(body.assumeBalanceAvailable),
    optionalNumber(body.monthlyAmortization), optionalNumber(body.downpaymentPercent),
    optionalNumber(body.bedrooms), optionalNumber(body.bathrooms), optionalNumber(body.floorAreaSqm),
    optionalNumber(body.lotAreaSqm), body.neighborhoodSlug || null, body.barangay || null,
    address, lng, lat, status, Boolean(body.isForeclosed), Boolean(body.isFeatured),
    id, actor.role, actor.userId, optionalNumber(body.parkingSpaces), developerId,
  ];

  const { rows } = await db.query<{ id: string; slug: string }>({
    text: `
      UPDATE properties p SET
        title = $1, description = $2,
        property_type_id = (SELECT id FROM property_types WHERE slug = $3 LIMIT 1),
        developer_id = $29::uuid,
        previous_price = CASE WHEN $5 < p.price THEN p.price ELSE p.previous_price END,
        price_reduced_at = CASE WHEN $5 < p.price THEN now() ELSE p.price_reduced_at END,
        price = $5, listing_intent = $6, availability = $7, rent_price = $8,
        financing_available = $9, assume_balance_available = $10,
        monthly_amortization = $11, downpayment_percent = $12,
        bedrooms = $13, bathrooms = $14, floor_area_sqm = $15, lot_area_sqm = $16, parking_spaces = $28,
        neighborhood_id = (SELECT id FROM neighborhoods WHERE slug = $17 LIMIT 1),
        barangay = $18, address = $19,
        location = ST_MakePoint($20, $21)::geography,
        status = CASE WHEN $7 = 'sold' THEN 'sold' WHEN $7 IN ('rented','inactive') THEN 'inactive' ELSE $22 END,
        is_foreclosed = $23,
        is_featured = CASE WHEN $26 = 'admin' THEN $24 ELSE p.is_featured END,
        updated_at = now()
      WHERE p.id = $25::uuid
        AND (
          $26 = 'admin'
          OR ($26 = 'seller' AND p.seller_id = $27::uuid)
          OR ($26 = 'agent' AND EXISTS (SELECT 1 FROM agents a WHERE a.id = p.agent_id AND a.user_id = $27::uuid))
        )
      RETURNING p.id, p.slug
    `,
    values,
  });

  if (!rows[0]) return NextResponse.json({ error: "Listing not found or access denied." }, { status: 403 });
  await syncPropertyPlaces(id,body.primaryPlace,body.nearbyPlaces,actor);
  return NextResponse.json({ success: true, ...rows[0] });
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const actor=await requireRole(["admin","agent","seller"]);if(!actor)return NextResponse.json({error:"Not authorized"},{status:401});
  const{id}=await params;const body=await request.json().catch(()=>({}));
  const owned=`($2='admin' OR ($2='seller' AND p.seller_id=$3::uuid) OR ($2='agent' AND EXISTS(SELECT 1 FROM agents a WHERE a.id=p.agent_id AND a.user_id=$3::uuid)))`;
  if(body.mode!=="permanent") {const{rows}=await db.query({text:`UPDATE properties p SET status='inactive',availability='inactive',archived_at=now(),archive_reason=$4,updated_at=now() WHERE id=$1::uuid AND ${owned} RETURNING id`,values:[id,actor.role,actor.userId,body.reason||"Archived by listing owner"]});return rows[0]?NextResponse.json({success:true,mode:"archive"}):NextResponse.json({error:"Not found or access denied"},{status:403})}
  if(actor.role!=="admin")return NextResponse.json({error:"Only an administrator can permanently delete a listing."},{status:403});
  const{rows}=await db.query<{title:string;imageUrls:string[]}>({text:`SELECT p.title,COALESCE(array_agg(pi.url) FILTER(WHERE pi.url IS NOT NULL),'{}') AS "imageUrls" FROM properties p LEFT JOIN property_images pi ON pi.property_id=p.id WHERE p.id=$1::uuid GROUP BY p.id`,values:[id]});if(!rows[0])return NextResponse.json({error:"Listing not found"},{status:404});
  if(body.confirmation!==rows[0].title)return NextResponse.json({error:"Type the exact listing title to confirm permanent deletion."},{status:400});
  const paths=rows[0].imageUrls.map(storagePath).filter((x):x is string=>Boolean(x));if(paths.length){const{error}=await storage.storage.from("property-images").remove(paths);if(error)return NextResponse.json({error:"Storage cleanup failed, so the listing was not deleted. Please retry."},{status:502})}
  await db.query({text:`DELETE FROM properties WHERE id=$1::uuid`,values:[id]});return NextResponse.json({success:true,mode:"permanent"});
}

function storagePath(value:string){try{const u=new URL(value),root=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);const marker="/storage/v1/object/public/property-images/";return u.hostname===root.hostname&&u.pathname.includes(marker)?decodeURIComponent(u.pathname.split(marker)[1]):null}catch{return null}}

function optionalNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
