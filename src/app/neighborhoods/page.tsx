export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { db } from "@/lib/supabase/server";
import { NeighborhoodInsightCard } from "@/components/neighborhood/NeighborhoodInsightCard";

export const metadata: Metadata = {
  title: "Davao Neighborhood Guides",
  description:
    "Explore Davao neighborhood insights, local buyer fit, market reality, cautions, average asking prices, and available listings by area.",
  alternates: {
    canonical: "/neighborhoods",
  },
};

type Neighborhood = {
  id: string;
  name: string;
  slug: string;
  overview: string | null;
  listingCount: number;
  avgPricePerSqm: number | null;
  advantages: string[] | null;
  disadvantages: string[] | null;
  characterText: string | null;
  whoBuysHere: string | null;
  marketReality: string | null;
  bestFor: string | null;
  cautionText: string | null;
};

async function hasColumn(columnName: string) {
  const { rows } = await db.query<{ exists: boolean }>({
    text: `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'neighborhoods'
        AND column_name = $1
      ) AS exists
    `,
    values: [columnName],
  });
  return Boolean(rows[0]?.exists);
}

export default async function NeighborhoodsPage() {
  const [characterColumn, buyersColumn, marketColumn, bestColumn, cautionColumn] = await Promise.all([
    hasColumn("character_text"),
    hasColumn("who_buys_here"),
    hasColumn("market_reality"),
    hasColumn("best_for"),
    hasColumn("caution_text"),
  ]);
  const { rows } = await db.query<Neighborhood>({
    text: `
      SELECT
        n.id,
        n.name,
        n.slug,
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
        )::float AS "avgPricePerSqm",
        n.advantages,
        n.disadvantages,
        ${characterColumn ? 'n.character_text' : 'NULL::text'} AS "characterText",
        ${buyersColumn ? 'n.who_buys_here' : 'NULL::text'} AS "whoBuysHere",
        ${marketColumn ? 'n.market_reality' : 'NULL::text'} AS "marketReality",
        ${bestColumn ? 'n.best_for' : 'NULL::text'} AS "bestFor",
        ${cautionColumn ? 'n.caution_text' : 'NULL::text'} AS "cautionText",
        COUNT(p.id)::int AS "listingCount"
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
      ORDER BY COUNT(p.id) DESC, n.name
    `,
    values: [],
  });
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-navy-900">Davao neighborhoods</h1>
      <p className="mt-2 max-w-2xl text-navy-500">Explore local market insight, buyer fit, cautions, and available properties by area.</p>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {rows.map((neighborhood) => (
          <NeighborhoodInsightCard key={neighborhood.id} {...neighborhood} />
        ))}
      </div>
    </main>
  );
}
