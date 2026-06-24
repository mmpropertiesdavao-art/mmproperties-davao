// src/app/api/admin/properties/bulk/route.ts
//
// Backs the CSV bulk-import page. Accepts an array of row objects already
// parsed client-side (papaparse), geocodes each address, and reports
// per-row success/failure rather than failing the whole batch on one bad row
// — a single typo'd address in a 100-row sheet shouldn't block the other 99.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";
import { slugify } from "@/lib/slugify";
import { requireRole } from "@/lib/auth/requireRole";
import { findDuplicateListings, resolveDeveloper, syncPropertyPlaces } from "@/lib/taxonomy";

interface BulkRow {
  title: string;
  propertyTypeSlug: string;
  price: number;
  address: string;
  description?: string;
  developerName?: string;
  paymentTerms?: string;
  monthlyAmortization?: number;
  downpaymentPercent?: number;
  bedrooms?: number;
  bathrooms?: number;
  floorAreaSqm?: number;
  lotAreaSqm?: number;
  parkingSpaces?: number;
  neighborhoodSlug?: string;
  barangay?: string;
  isForeclosed?: boolean;
  listingIntent?: "sale" | "rent" | "sale_or_rent";
  availability?: "available" | "reserved" | "rented" | "sold" | "inactive";
  rentPrice?: number;
  financingAvailable?: boolean;
  assumeBalanceAvailable?: boolean;
  lat?: number;
  lng?: number;
  primaryPlace?: string;
  nearbyPlaces?: string[] | string;
  allowDuplicate?: boolean;
}

interface RowResult {
  row: number;
  title: string;
  status: "created" | "failed";
  error?: string;
}

export async function POST(req: NextRequest) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { rows }: { rows: BulkRow[] } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }
  if (rows.length > 200) {
    return NextResponse.json({ error: "Limit 200 rows per import — split larger sheets into batches" }, { status: 400 });
  }

  const results: RowResult[] = [];

  for (const [i, row] of rows.entries()) {
    try {
      if (!row.title || !row.price || !row.address || !row.propertyTypeSlug) {
        results.push({ row: i + 1, title: row.title ?? "(untitled)", status: "failed", error: "Missing required field" });
        continue;
      }
      const listingIntent = row.listingIntent || "sale";
      const availability = row.availability || "available";
      if (!["sale", "rent", "sale_or_rent"].includes(listingIntent) || !["available", "reserved", "rented", "sold", "inactive"].includes(availability)) {
        results.push({ row: i + 1, title: row.title, status: "failed", error: "Invalid listingIntent or availability" });
        continue;
      }

      const manualPin = parseManualPin(row.lat, row.lng);
      const geocoded = manualPin ? null : await geocodeAddress(row.address);
      const location = manualPin ?? geocoded;
      if (!location) {
        results.push({ row: i + 1, title: row.title, status: "failed", error: "Address could not be located" });
        continue;
      }

      const slug = slugify(row.title, `${Date.now().toString(36)}-${i}`);
      const duplicates=await findDuplicateListings({title:row.title,address:row.address,price:Number(row.price),lat:location.lat,lng:location.lng});
      if(duplicates.length&&!row.allowDuplicate){results.push({row:i+1,title:row.title,status:"failed",error:`Possible duplicate: ${duplicates.map(d=>String(d.title)).join(", ")}. Review or set allowDuplicate=true.`});continue}
      const developerId=await resolveDeveloper(row.developerName,actor);

      const { rows: inserted } = await db.query({
        text: `
          INSERT INTO properties (
            title, slug, description, property_type_id, developer_id, agent_id, seller_id,
            price, monthly_amortization, downpayment_percent,
            bedrooms, bathrooms, floor_area_sqm, lot_area_sqm, parking_spaces,
            neighborhood_id, barangay, address, location, is_foreclosed,
            listing_intent, availability, rent_price, financing_available, assume_balance_available
          )
          SELECT
            $1, $2, $3, pt.id,
            $27::uuid,
            CASE WHEN $19 = 'agent' THEN (SELECT id FROM agents WHERE user_id = $18 LIMIT 1) ELSE NULL END,
            CASE WHEN $19 = 'seller' THEN $18::uuid ELSE NULL END,
            $5, $6, $7, $8, $9, $10, $11, $26,
            (SELECT id FROM neighborhoods WHERE slug = $12 LIMIT 1),
            $13, $14, ST_MakePoint($15, $16)::geography, $17,
            $21, $22, $23, $24, $25
          FROM property_types pt WHERE pt.slug = $20
          RETURNING id
        `,
        values: [
          row.title,
          slug,
          row.description ?? null,
          row.developerName ?? null,
          row.price,
          row.monthlyAmortization ?? null,
          row.downpaymentPercent ?? null,
          row.bedrooms ?? null,
          row.bathrooms ?? null,
          row.floorAreaSqm ?? null,
          row.lotAreaSqm ?? null,
          row.neighborhoodSlug ?? null,
          row.barangay ?? null,
          row.address,
          location.lng,
          location.lat,
          Boolean(row.isForeclosed),
          actor.userId,
          actor.role,
          row.propertyTypeSlug,
          listingIntent,
          availability,
          row.rentPrice ?? null,
          Boolean(row.financingAvailable),
          Boolean(row.assumeBalanceAvailable),
          row.parkingSpaces ?? null,
          developerId,
        ],
      });

      if (!inserted[0]) {
        results.push({ row: i + 1, title: row.title, status: "failed", error: "Invalid propertyTypeSlug" });
        continue;
      }
      await syncPropertyPlaces(inserted[0].id,row.primaryPlace,row.nearbyPlaces,actor);

      results.push({ row: i + 1, title: row.title, status: "created" });
    } catch (err) {
      results.push({ row: i + 1, title: row.title ?? "(untitled)", status: "failed", error: "Unexpected error" });
      console.error(`Bulk import row ${i + 1} failed`, err);
    }
  }

  const createdCount = results.filter((r) => r.status === "created").length;
  return NextResponse.json({ createdCount, failedCount: results.length - createdCount, results });
}

function parseManualPin(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  if (parsedLat < 6.7 || parsedLat > 7.5 || parsedLng < 125.2 || parsedLng > 126) return null;
  return { lat: parsedLat, lng: parsedLng };
}
