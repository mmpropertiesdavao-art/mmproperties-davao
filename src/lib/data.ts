// src/lib/data.ts
//
// Thin data-access helpers used by server components and the sitemap.
// Swap the query bodies for real Supabase/Postgres calls — kept as a
// single seam here so pages don't import the DB client directly.

import { db } from "@/lib/supabase/server";
import type { Neighborhood, Property } from "@/types/property";

export async function getAllNeighborhoods(): Promise<Neighborhood[]> {
  const { rows } = await db.query({
    text: `
      SELECT
        n.id,
        n.name,
        n.slug,
        n.barangay,
        n.city,
        n.overview,
        AVG(
          CASE
            WHEN p.price IS NULL OR p.price <= 0 THEN NULL
            WHEN pt.slug IN ('lot-only','house-and-lot','townhouse') AND p.lot_area_sqm > 0 THEN p.price / p.lot_area_sqm
            WHEN pt.slug IN ('condominium','commercial') AND p.floor_area_sqm > 0 THEN p.price / p.floor_area_sqm
            WHEN p.lot_area_sqm > 0 THEN p.price / p.lot_area_sqm
            WHEN p.floor_area_sqm > 0 THEN p.price / p.floor_area_sqm
            ELSE NULL
          END
        )::float AS avg_price_per_sqm,
        n.advantages,
        n.disadvantages,
        ST_Y(n.centroid::geometry) AS lat,
        ST_X(n.centroid::geometry) AS lng
      FROM neighborhoods n
      LEFT JOIN properties p ON p.status='active' AND p.availability='available' AND (
        p.neighborhood_id=n.id
        OR p.barangay ILIKE '%' || n.name || '%'
        OR p.barangay ILIKE '%' || COALESCE(n.barangay, n.name) || '%'
        OR p.address ILIKE '%' || n.name || '%'
        OR p.address ILIKE '%' || COALESCE(n.barangay, n.name) || '%'
        OR regexp_replace(lower(translate(COALESCE(p.barangay, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') LIKE '%' || regexp_replace(lower(translate(COALESCE(n.name, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') || '%'
        OR regexp_replace(lower(translate(COALESCE(p.address, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') LIKE '%' || regexp_replace(lower(translate(COALESCE(n.name, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') || '%'
      )
      LEFT JOIN property_types pt ON pt.id=p.property_type_id
      GROUP BY n.id
      ORDER BY n.name
    `,
    values: [],
  });
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    barangay: r.barangay,
    city: r.city,
    overview: r.overview,
    avgPricePerSqm: r.avg_price_per_sqm,
    advantages: r.advantages ?? [],
    disadvantages: r.disadvantages ?? [],
    centroid: { lat: r.lat, lng: r.lng },
  }));
}

export async function getNeighborhoodBySlug(slug: string): Promise<Neighborhood | null> {
  const all = await getAllNeighborhoods();
  return all.find((n) => n.slug === slug) ?? null;
}

export async function getActiveDevelopers(featuredOnly=false){const{rows}=await db.query({text:`SELECT d.id,d.name,d.slug,d.logo_url AS "logoUrl",d.website,d.is_featured AS "isFeatured",d.display_order AS "displayOrder",(SELECT count(*)::int FROM properties p WHERE p.developer_id=d.id AND p.status='active') AS "listingCount" FROM developers d WHERE d.is_active=true AND d.approval_status='approved' AND d.merged_into_id IS NULL AND ($1::boolean=false OR (d.is_featured=true AND d.logo_url IS NOT NULL AND EXISTS(SELECT 1 FROM properties p WHERE p.developer_id=d.id AND p.status='active'))) ORDER BY d.is_featured DESC,d.display_order,d.name`,values:[featuredOnly]});return rows as {id:string;name:string;slug:string;logoUrl:string|null;website:string|null;isFeatured:boolean;displayOrder:number;listingCount:number}[]}

export async function getHomepageNeighborhoods(){const{rows}=await db.query({text:`
  SELECT
    n.id,
    n.name,
    n.slug,
    AVG(
      CASE
        WHEN p.price IS NULL OR p.price <= 0 THEN NULL
        WHEN pt.slug IN ('lot-only','house-and-lot','townhouse') AND p.lot_area_sqm > 0 THEN p.price / p.lot_area_sqm
        WHEN pt.slug IN ('condominium','commercial') AND p.floor_area_sqm > 0 THEN p.price / p.floor_area_sqm
        WHEN p.lot_area_sqm > 0 THEN p.price / p.lot_area_sqm
        WHEN p.floor_area_sqm > 0 THEN p.price / p.floor_area_sqm
        ELSE NULL
      END
    )::float AS "avgPricePerSqm",
    count(p.id)::int AS "listingCount"
  FROM neighborhoods n
  LEFT JOIN properties p ON p.status='active' AND p.availability='available' AND (
    p.neighborhood_id=n.id
    OR p.barangay ILIKE '%' || n.name || '%'
    OR p.barangay ILIKE '%' || COALESCE(n.barangay, n.name) || '%'
    OR p.address ILIKE '%' || n.name || '%'
    OR p.address ILIKE '%' || COALESCE(n.barangay, n.name) || '%'
    OR regexp_replace(lower(translate(COALESCE(p.barangay, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') LIKE '%' || regexp_replace(lower(translate(COALESCE(n.name, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') || '%'
    OR regexp_replace(lower(translate(COALESCE(p.address, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') LIKE '%' || regexp_replace(lower(translate(COALESCE(n.name, ''), 'ñÑéÉ', 'nNeE')), '[^a-z0-9]+', '', 'g') || '%'
  )
  LEFT JOIN property_types pt ON pt.id=p.property_type_id
  GROUP BY n.id
  ORDER BY count(p.id) DESC,n.name
  LIMIT 8
`,values:[]});return rows as {id:string;name:string;slug:string;avgPricePerSqm:number|null;listingCount:number}[]}

export async function getAllActiveProperties(): Promise<(Property & { updatedAt: string })[]> {
  const { rows } = await db.query({
    text: `SELECT slug, updated_at FROM properties WHERE status = 'active'`,
    values: [],
  });
  return rows as any;
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  const { rows } = await db.query({
    text: `
      SELECT p.id,p.public_id AS "publicId",p.slug,p.title,p.description,p.price::float AS price,
             p.monthly_amortization::float AS "monthlyAmortization",p.downpayment_percent::float AS "downpaymentPercent",p.payment_terms AS "paymentTerms",
             p.bedrooms,p.bathrooms::float AS bathrooms,p.floor_area_sqm::float AS "floorAreaSqm",p.lot_area_sqm::float AS "lotAreaSqm",p.parking_spaces AS "parkingSpaces",
             p.barangay,p.address,p.status,p.is_foreclosed AS "isForeclosed",p.is_featured AS "isFeatured",
             COALESCE(p.carousel_enabled,false) AS "carouselEnabled",COALESCE(p.carousel_order,100) AS "carouselOrder",
             p.listing_intent AS "listingIntent",p.availability,p.rent_price::float AS "rentPrice",
             p.financing_available AS "financingAvailable",p.assume_balance_available AS "assumeBalanceAvailable",
             p.previous_price::float AS "previousPrice",p.price_reduced_at AS "priceReducedAt",
             pt.slug AS "propertyType",pt.label AS "propertyTypeLabel",n.name AS "neighborhoodName",n.slug AS "neighborhoodSlug",d.name AS "developerName",
             COALESCE(au.full_name,su.full_name) AS "agentName",a.agency_name AS "agencyName",
             EXTRACT(day FROM now()-p.created_at)::int AS "daysListed",
             (SELECT COUNT(*)::int FROM property_views v WHERE v.property_id=p.id) AS "viewCount",
             (SELECT COUNT(*)::int FROM favorites f WHERE f.property_id=p.id) AS "saveCount",
             (SELECT url FROM property_images pi WHERE pi.property_id=p.id ORDER BY pi.is_cover DESC,pi.sort_order LIMIT 1) AS "coverImageUrl",
             ST_X(p.location::geometry) AS lng,ST_Y(p.location::geometry) AS lat
      FROM properties p
      JOIN property_types pt ON pt.id = p.property_type_id
      LEFT JOIN neighborhoods n ON n.id = p.neighborhood_id
      LEFT JOIN developers d ON d.id = p.developer_id
      LEFT JOIN agents a ON a.id=p.agent_id
      LEFT JOIN users au ON au.id=a.user_id
      LEFT JOIN users su ON su.id=p.seller_id
      WHERE p.slug = $1
    `,
    values: [slug],
  });
  return (rows[0] as Property) ?? null;
}
