export const dynamic = 'force-dynamic';

// src/app/api/properties/search/route.ts
//
// Powers the split-screen search page. Accepts either a geospatial mode
// (bbox / radius / polygon, for the map) or plain filters (for the
// listings panel), and always applies the combined filter set on top.

import { NextRequest, NextResponse } from "next/server";
import {
  bboxSearchQuery,
  combinedFilterSearchQuery,
  polygonSearchQuery,
  radiusSearchQuery,
} from "@/lib/postgis/queries";
import { db } from "@/lib/supabase/server"; // thin wrapper around the Postgres connection
import type { PropertySearchFilters } from "@/types/property";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const filters: PropertySearchFilters = {
    minPrice: numberOrUndefined(params.get("minPrice")),
    maxPrice: numberOrUndefined(params.get("maxPrice")),
    propertyType: (params.get("propertyType") as PropertySearchFilters["propertyType"]) ?? undefined,
    developerName: params.get("developerName") ?? undefined,
    neighborhoodId: params.get("neighborhoodId") ?? undefined,
    barangay: params.get("barangay") ?? undefined,
    minBedrooms: numberOrUndefined(params.get("minBedrooms")),
    minBathrooms: numberOrUndefined(params.get("minBathrooms")),
    maxMonthlyAmortization: numberOrUndefined(params.get("maxMonthlyAmortization")),
    minDownpaymentPercent: numberOrUndefined(params.get("minDownpaymentPercent")),
    isForeclosed: params.get("isForeclosed") === "true" ? true : undefined,
    financingAvailable: params.get("financingAvailable") === "true" ? true : undefined,
    assumeBalanceAvailable: params.get("assumeBalanceAvailable") === "true" ? true : undefined,
    query: params.get("q")?.trim() || undefined,
    listingIntent: (params.get("listingIntent") as PropertySearchFilters["listingIntent"]) || undefined,
    page: numberOrUndefined(params.get("page")) ?? 1,
    pageSize: numberOrUndefined(params.get("pageSize")) ?? 24,
  };

  // Geospatial mode takes priority for the map's viewport-driven fetches.
  const bbox = params.get("bbox"); // "minLng,minLat,maxLng,maxLat"
  const radius = params.get("radius"); // "lng,lat,meters"

  try {
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      const { rows } = await db.query(bboxSearchQuery(minLng, minLat, maxLng, maxLat));
      return NextResponse.json({ results: rows });
    }

    if (radius) {
      const [lng, lat, meters] = radius.split(",").map(Number);
      const { rows } = await db.query(radiusSearchQuery(lng, lat, meters));
      return NextResponse.json({ results: rows });
    }

    const { rows } = await db.query(combinedFilterSearchQuery(filters));
    return NextResponse.json({ results: rows, totalCount: rows[0]?.totalCount ?? 0, page: filters.page, pageSize: filters.pageSize });
  } catch (err) {
    console.error("properties/search failed", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

// "Search this area" — user-drawn polygon, sent as a POST body since
// GeoJSON polygons don't fit cleanly in query params.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const polygon: GeoJSON.Polygon | undefined = body.polygon;
    if (!polygon) {
      return NextResponse.json({ error: "polygon is required" }, { status: 400 });
    }
    const { rows } = await db.query(polygonSearchQuery(polygon));
    return NextResponse.json({ results: rows });
  } catch (err) {
    console.error("properties/search polygon failed", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

function numberOrUndefined(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

