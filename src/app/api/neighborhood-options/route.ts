export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type NeighborhoodOption = {
  id: string | null;
  name: string;
  source: "neighborhood" | "barangay" | "place" | "developer_project";
  kind: string;
  listingCount: number;
  projectCount: number;
  aliases: string[];
};

export async function GET() {
  try {
    const { rows } = await db.query<NeighborhoodOption>({
      text: `
        WITH raw_options AS (
          SELECT
            n.id::text AS id,
            trim(n.name) AS name,
            'neighborhood'::text AS source,
            'area'::text AS kind,
            COUNT(DISTINCT p.id)::int AS listing_count,
            0::int AS project_count,
            ARRAY[]::text[] AS aliases,
            10::int AS source_rank
          FROM neighborhoods n
          LEFT JOIN properties p ON p.neighborhood_id = n.id AND p.status = 'active'
          WHERE NULLIF(trim(n.name), '') IS NOT NULL
          GROUP BY n.id, n.name

          UNION ALL

          SELECT
            NULL::text AS id,
            trim(p.barangay) AS name,
            'barangay'::text AS source,
            'barangay'::text AS kind,
            COUNT(DISTINCT p.id)::int AS listing_count,
            0::int AS project_count,
            ARRAY[]::text[] AS aliases,
            20::int AS source_rank
          FROM properties p
          WHERE p.status = 'active'
            AND NULLIF(trim(p.barangay), '') IS NOT NULL
          GROUP BY lower(trim(p.barangay)), trim(p.barangay)

          UNION ALL

          SELECT
            pl.id::text AS id,
            trim(pl.name) AS name,
            'place'::text AS source,
            COALESCE(NULLIF(pl.kind, ''), 'place')::text AS kind,
            COUNT(DISTINCT prop.id)::int AS listing_count,
            0::int AS project_count,
            COALESCE(array_remove(array_agg(DISTINCT pa.alias), NULL), ARRAY[]::text[]) AS aliases,
            CASE COALESCE(NULLIF(pl.kind, ''), 'place')
              WHEN 'neighborhood' THEN 12
              WHEN 'barangay' THEN 22
              WHEN 'subdivision' THEN 30
              WHEN 'district' THEN 35
              WHEN 'landmark' THEN 40
              ELSE 50
            END AS source_rank
          FROM places pl
          LEFT JOIN place_aliases pa ON pa.place_id = pl.id
          LEFT JOIN property_places pp ON pp.place_id = pl.id
          LEFT JOIN properties prop ON prop.id = pp.property_id AND prop.status = 'active'
          WHERE pl.status = 'active'
            AND NULLIF(trim(pl.name), '') IS NOT NULL
          GROUP BY pl.id, pl.name, pl.kind

          UNION ALL

          SELECT
            dp.id::text AS id,
            trim(dp.project_name) AS name,
            'developer_project'::text AS source,
            'project'::text AS kind,
            0::int AS listing_count,
            COUNT(DISTINCT dp.id)::int AS project_count,
            ARRAY[]::text[] AS aliases,
            60::int AS source_rank
          FROM developer_projects dp
          WHERE dp.active = true
            AND dp.status <> 'inactive'
            AND NULLIF(trim(dp.project_name), '') IS NOT NULL
          GROUP BY dp.id, dp.project_name

          UNION ALL

          SELECT
            NULL::text AS id,
            trim(dp.barangay) AS name,
            'developer_project'::text AS source,
            'project_area'::text AS kind,
            0::int AS listing_count,
            COUNT(DISTINCT dp.id)::int AS project_count,
            ARRAY[]::text[] AS aliases,
            65::int AS source_rank
          FROM developer_projects dp
          WHERE dp.active = true
            AND dp.status <> 'inactive'
            AND NULLIF(trim(dp.barangay), '') IS NOT NULL
          GROUP BY lower(trim(dp.barangay)), trim(dp.barangay)
        ),
        ranked AS (
          SELECT DISTINCT ON (lower(name))
            id,
            name,
            source,
            kind,
            listing_count AS "listingCount",
            project_count AS "projectCount",
            aliases,
            source_rank
          FROM raw_options
          ORDER BY lower(name), source_rank ASC, (listing_count + project_count) DESC, name ASC
        )
        SELECT id, name, source, kind, "listingCount", "projectCount", aliases
        FROM ranked
        ORDER BY ("listingCount" + "projectCount") DESC, source_rank ASC, name ASC
        LIMIT 300
      `,
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("neighborhood-options failed", error);
    return NextResponse.json({ error: "Could not load neighborhoods." }, { status: 500 });
  }
}
