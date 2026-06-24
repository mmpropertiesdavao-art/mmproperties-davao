export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const visitorId = String(body.visitorId ?? "").slice(0, 100);
  if (!visitorId) return NextResponse.json({ error: "visitorId is required" }, { status: 400 });
  await db.query({
    text: `INSERT INTO property_views (property_id, visitor_id, source) SELECT $1::uuid, $2, $3 WHERE EXISTS (SELECT 1 FROM properties WHERE id = $1::uuid) AND NOT EXISTS (SELECT 1 FROM property_views WHERE property_id = $1::uuid AND visitor_id = $2 AND viewed_at > now() - interval '12 hours')`,
    values: [id, visitorId, body.source || "direct"],
  });
  return NextResponse.json({ recorded: true });
}
