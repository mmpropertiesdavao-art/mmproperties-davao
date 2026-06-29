export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type NeighborhoodOption = {
  id: string | null;
  name: string;
  source: "neighborhood" | "barangay" | "place" | "developer_project";
};

export async function GET() {
  try {
    const { rows } = await db.query<NeighborhoodOption>({
      text: `
        WITH options AS (
          SELECT n.id::text AS id, n.name, 'neighborhood'::text AS source
          FROM neighborhoods n
          WHERE NULLIF(trim(n.name), '') IS NOT NULL

          UNION

          SELECT NULL::text AS id, trim(p.barangay) AS name, 'barangay'::text AS source
          FROM properties p
          WHERE p.status = 'active'
            AND NULLIF(trim(p.barangay), '') IS NOT NULL

          UNION

          SELECT NULL::text AS id, trim(pl.name) AS name, 'place'::text AS source
          FROM places pl
          WHERE pl.status = 'active'
            AND NULLIF(trim(pl.name), '') IS NOT NULL

          UNION

          SELECT NULL::text AS id, trim(dp.barangay) AS name, 'developer_project'::text AS source
          FROM developer_projects dp
          WHERE dp.active = true
            AND dp.status <> 'inactive'
            AND NULLIF(trim(dp.barangay), '') IS NOT NULL
        )
        SELECT MIN(id) AS id, name, MIN(source)::text AS source
        FROM options
        GROUP BY lower(name), name
        ORDER BY name ASC
        LIMIT 250
      `,
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("neighborhood-options failed", error);
    return NextResponse.json({ error: "Could not load neighborhoods." }, { status: 500 });
  }
}
