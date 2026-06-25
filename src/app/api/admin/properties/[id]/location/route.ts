export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 6.7 || lat > 7.5 || lng < 125.2 || lng > 126) {
    return NextResponse.json({ error: "Choose a valid pin in the Davao area." }, { status: 400 });
  }

  const { rows } = await db.query({
    text: `
      UPDATE properties p SET location = ST_MakePoint($1, $2)::geography, updated_at = now()
      FROM (SELECT p2.id, p2.seller_id, a.user_id AS agent_user_id FROM properties p2 LEFT JOIN agents a ON a.id = p2.agent_id WHERE p2.id = $3::uuid) owned
      WHERE p.id = owned.id
        AND ($4::text = 'admin' OR ($4::text = 'seller' AND owned.seller_id = $5::uuid) OR ($4::text = 'agent' AND owned.agent_user_id = $5::uuid))
      RETURNING p.id
    `,
    values: [lng, lat, id, actor.role, actor.userId],
  });
  if (!rows[0]) return NextResponse.json({ error: "Listing not found or access denied." }, { status: 403 });
  return NextResponse.json({ success: true, lat, lng });
}
