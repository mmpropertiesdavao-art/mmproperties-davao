import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/requireRole";

export async function GET() {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { rows } = await db.query({
      text: `
        SELECT p.id, p.title, p.address, p.price::float AS price, p.status,
          p.listing_intent AS "listingIntent", p.availability, p.updated_at AS "updatedAt",
          (SELECT url FROM property_images pi WHERE pi.property_id=p.id ORDER BY pi.is_cover DESC,pi.sort_order LIMIT 1) AS "coverImageUrl",
          ST_Y(p.location::geometry) AS lat,
          ST_X(p.location::geometry) AS lng
        FROM properties p
        LEFT JOIN agents a ON a.id = p.agent_id
        WHERE ($1 = 'admin' OR ($1 = 'seller' AND p.seller_id = $2::uuid) OR ($1 = 'agent' AND a.user_id = $2::uuid))
        ORDER BY p.updated_at DESC, p.title ASC
      `,
      values: [actor.role, actor.userId],
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to load properties" },
      { status: 500 }
    );
  }
}
