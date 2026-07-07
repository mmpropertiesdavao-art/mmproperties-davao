// src/lib/postgis/queries.ts
//
// Query builders for the geospatial search patterns the platform needs.
// These return { text, values } pairs ready for a parameterized query
// (works with `pg`, Supabase's postgres-js client, or any driver that
// takes positional placeholders).

import type { PropertySearchFilters } from "@/types/property";

interface SqlQuery {
  text: string;
  values: unknown[];
}

const BASE_SELECT = `
  SELECT
    COUNT(*) OVER()::int AS "totalCount",
    p.id,
    p.public_id AS "publicId",
    p.slug,
    p.title,
    p.description,
    p.price::float AS price,
    p.rent_price::float AS "rentPrice",
    p.listing_intent AS "listingIntent",
    p.availability,
    p.financing_available AS "financingAvailable",
    p.assume_balance_available AS "assumeBalanceAvailable",
    p.previous_price::float AS "previousPrice",
    p.price_reduced_at AS "priceReducedAt",

    (
      SELECT url
      FROM property_images pi
      WHERE pi.property_id = p.id
      ORDER BY pi.is_cover DESC, pi.sort_order ASC
      LIMIT 1
    ) AS "coverImageUrl",

    p.monthly_amortization::float AS "monthlyAmortization",
    p.downpayment_percent::float AS "downpaymentPercent",
    p.bedrooms,
    p.bathrooms::float AS bathrooms,
    p.floor_area_sqm::float AS "floorAreaSqm",
    p.lot_area_sqm::float AS "lotAreaSqm",
    p.parking_spaces AS "parkingSpaces",
    p.barangay,
    p.address,
    p.is_foreclosed AS "isForeclosed",
    p.is_featured AS "isFeatured",
    COALESCE(p.carousel_enabled, false) AS "carouselEnabled",
    COALESCE(p.carousel_order, 100) AS "carouselOrder",
    p.status,
    EXTRACT(day FROM now() - p.created_at)::int AS "daysListed",
    (SELECT COUNT(*)::int FROM property_views pv WHERE pv.property_id = p.id) AS "viewCount",
    (SELECT COUNT(*)::int FROM favorites f WHERE f.property_id = p.id) AS "saveCount",

    ST_X(p.location::geometry) AS lng,
    ST_Y(p.location::geometry) AS lat,

    pt.slug AS "propertyType",
    pt.label AS "propertyTypeLabel",

    n.name AS "neighborhoodName",
    n.slug AS "neighborhoodSlug",
    COALESCE((SELECT pl.name FROM property_places pp JOIN places pl ON pl.id=pp.place_id WHERE pp.property_id=p.id AND pp.relation='primary' LIMIT 1),n.name) AS "primaryPlace",
    COALESCE((SELECT array_agg(pl.name ORDER BY pp.sort_order) FROM property_places pp JOIN places pl ON pl.id=pp.place_id WHERE pp.property_id=p.id AND pp.relation='nearby'),'{}') AS "nearbyPlaces",

    d.name AS "developerName",
    COALESCE(au.full_name, su.full_name) AS "agentName",
    a.agency_name AS "agencyName"

  FROM properties p

  JOIN property_types pt
    ON pt.id = p.property_type_id

  LEFT JOIN neighborhoods n
    ON n.id = p.neighborhood_id

  LEFT JOIN developers d
    ON d.id = p.developer_id
  LEFT JOIN agents a ON a.id = p.agent_id
  LEFT JOIN users au ON au.id = a.user_id
  LEFT JOIN users su ON su.id = p.seller_id
`;

/**
 * Radius search — "properties within N meters of a point".
 * Used for "near me" search and the AI matcher's lifestyle filters
 * (e.g. "near schools" resolves to a school's location + a fixed radius).
 */
export function radiusSearchQuery(lng: number, lat: number, meters: number, limit = 50): SqlQuery {
  return {
    text: `
      ${BASE_SELECT}
      WHERE p.status = 'active'
        AND ST_DWithin(p.location, ST_MakePoint($1, $2)::geography, $3)
      ORDER BY ST_Distance(p.location, ST_MakePoint($1, $2)::geography) ASC
      LIMIT $4
    `,
    values: [lng, lat, meters, limit],
  };
}

/**
 * Bounding-box search — current map viewport. Cheaper than radius search
 * since it uses the GIST index directly via the `&&` overlap operator.
 */
export function bboxSearchQuery(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  limit = 200,
): SqlQuery {
  return {
    text: `
      ${BASE_SELECT}
      WHERE p.status = 'active'
        AND p.location && ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
      LIMIT $5
    `,
    values: [minLng, minLat, maxLng, maxLat, limit],
  };
}

/**
 * "Search this area" — user-drawn polygon from Mapbox Draw, passed as GeoJSON.
 */
export function polygonSearchQuery(polygon: GeoJSON.Polygon, limit = 200): SqlQuery {
  return {
    text: `
      ${BASE_SELECT}
      WHERE p.status = 'active'
        AND ST_Within(p.location::geometry, ST_GeomFromGeoJSON($1))
      LIMIT $2
    `,
    values: [JSON.stringify(polygon), limit],
  };
}

/**
 * Combined-filter search — the workhorse query behind the main search page.
 * Every filter is optional; unset filters fall through via the
 * "$n IS NULL OR ..." pattern so one query handles the full filter bar.
 */
export function combinedFilterSearchQuery(filters: PropertySearchFilters): SqlQuery {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 24;
  const offset = (page - 1) * pageSize;

  const values: unknown[] = [
    filters.minPrice ?? null, // $1
    filters.maxPrice ?? null, // $2
    filters.propertyType ?? null, // $3
    filters.developerName ?? null, // $4
    filters.neighborhoodId ?? null, // $5
    filters.barangay ?? null, // $6
    filters.minBedrooms ?? null, // $7
    filters.minBathrooms ?? null, // $8
    filters.maxMonthlyAmortization ?? null, // $9
    filters.minDownpaymentPercent ?? null, // $10
    filters.isForeclosed ?? null, // $11
    filters.query ?? null, // $12
    filters.listingIntent ?? null, // $13
    filters.financingAvailable ?? null, // $14
    filters.assumeBalanceAvailable ?? null, // $15
    pageSize, // $16
    offset, // $17
  ];

  return {
    text: `
      ${BASE_SELECT}
      WHERE p.status = 'active'
        AND ($1::numeric IS NULL OR p.price >= $1)
        AND ($2::numeric IS NULL OR p.price <= $2)
        AND ($3::text IS NULL OR pt.slug = $3)
        AND ($4::text IS NULL OR d.name = $4)
        AND (
          ($5::uuid IS NULL AND $6::text IS NULL)
          OR (
            $5::uuid IS NOT NULL
            AND (
              p.neighborhood_id = $5
              OR EXISTS (
                SELECT 1
                FROM neighborhoods selected_n
                WHERE selected_n.id = $5
                  AND (
                    p.barangay ILIKE '%' || selected_n.name || '%'
                    OR p.barangay ILIKE '%' || COALESCE(selected_n.barangay, selected_n.name) || '%'
                    OR p.address ILIKE '%' || selected_n.name || '%'
                    OR p.address ILIKE '%' || COALESCE(selected_n.barangay, selected_n.name) || '%'
                    OR regexp_replace(lower(translate(COALESCE(p.barangay, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') LIKE '%' || regexp_replace(lower(translate(COALESCE(selected_n.name, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') || '%'
                    OR regexp_replace(lower(translate(COALESCE(p.address, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') LIKE '%' || regexp_replace(lower(translate(COALESCE(selected_n.name, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') || '%'
                    OR EXISTS (
                      SELECT 1
                      FROM property_places pp
                      JOIN places pl ON pl.id = pp.place_id
                      LEFT JOIN place_aliases pa ON pa.place_id = pl.id
                      WHERE pp.property_id = p.id
                        AND (
                          pl.name ILIKE '%' || selected_n.name || '%'
                          OR pa.alias ILIKE '%' || selected_n.name || '%'
                          OR regexp_replace(lower(translate(COALESCE(pl.name, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') LIKE '%' || regexp_replace(lower(translate(COALESCE(selected_n.name, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') || '%'
                          OR regexp_replace(lower(translate(COALESCE(pa.alias, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') LIKE '%' || regexp_replace(lower(translate(COALESCE(selected_n.name, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') || '%'
                        )
                    )
                  )
              )
            )
          )
          OR (
            $6::text IS NOT NULL
            AND (
              p.barangay ILIKE '%' || $6 || '%'
              OR n.name ILIKE '%' || $6 || '%'
              OR p.address ILIKE '%' || $6 || '%'
              OR EXISTS (
                SELECT 1
                FROM property_places pp
                JOIN places pl ON pl.id = pp.place_id
                LEFT JOIN place_aliases pa ON pa.place_id = pl.id
                WHERE pp.property_id = p.id
                  AND (
                    pl.name ILIKE '%' || $6 || '%'
                    OR pa.alias ILIKE '%' || $6 || '%'
                  )
              )
            )
          )
        )
        AND ($7::int IS NULL OR p.bedrooms >= $7)
        AND ($8::numeric IS NULL OR p.bathrooms >= $8)
        AND ($9::numeric IS NULL OR p.monthly_amortization <= $9)
        AND ($10::numeric IS NULL OR p.downpayment_percent <= $10)
        AND ($11::boolean IS NULL OR p.is_foreclosed = $11)
        AND ($12::text IS NULL OR p.search_vector @@ plainto_tsquery('english', $12))
        AND ($13::text IS NULL OR p.listing_intent = $13)
        AND ($14::boolean IS NULL OR p.financing_available = $14)
        AND ($15::boolean IS NULL OR p.assume_balance_available = $15)
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $16 OFFSET $17
    `,
    values,
  };
}

/**
 * Distance-to-amenity — used on the property detail page to render
 * "Distance to SM Lanang, Davao Doctors Hospital, Ateneo de Davao..."
 */
export function priceReducedPropertiesQuery(limit = 4): SqlQuery {
  return {
    text: `
      ${BASE_SELECT}
      WHERE p.status = 'active'
        AND p.availability = 'available'
        AND p.previous_price IS NOT NULL
        AND p.previous_price > p.price
      ORDER BY p.price_reduced_at DESC NULLS LAST, p.updated_at DESC
      LIMIT $1
    `,
    values: [limit],
  };
}

export function nearbyAmenitiesQuery(lng: number, lat: number, limit = 5): SqlQuery {
  return {
    text: `
      SELECT name, category, ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_m
      FROM (
        SELECT name, 'mall' AS category, location FROM malls
        UNION ALL SELECT name, 'hospital', location FROM hospitals
        UNION ALL SELECT name, type, location FROM schools
        UNION ALL SELECT name, category, location FROM landmarks
      ) poi
      ORDER BY distance_m ASC
      LIMIT $3
    `,
    values: [lng, lat, limit],
  };
}

/**
 * Full-text search across title/address/description (uses the
 * search_vector column maintained by the trigger in schema.sql).
 */
export function fullTextSearchQuery(term: string, limit = 24): SqlQuery {
  return {
    text: `
      SELECT p.id, p.slug, p.title, p.price, ts_rank(p.search_vector, query) AS rank
      FROM properties p, to_tsquery('english', $1) query
      WHERE p.search_vector @@ query AND p.status = 'active'
      ORDER BY rank DESC
      LIMIT $2
    `,
    values: [term.trim().split(/\s+/).join(" & "), limit],
  };
}
