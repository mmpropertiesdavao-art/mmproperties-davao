import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

const STATUS_MAP = {
  active: { status: "active", availability: "available" },
  sold: { status: "sold", availability: "sold" },
  reserved: { status: "active", availability: "reserved" },
  rented: { status: "active", availability: "rented" },
  inactive: { status: "inactive", availability: "inactive" },
} as const;

type ListingStatusAction = keyof typeof STATUS_MAP;

export async function PATCH(request: NextRequest, context: RouteContext) {
  const actor = await requireRole(["admin", "seller", "agent"]);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const action = String(body?.action || "") as ListingStatusAction;

  if (!Object.prototype.hasOwnProperty.call(STATUS_MAP, action)) {
    return NextResponse.json({ error: "Choose a valid listing status action." }, { status: 400 });
  }

  const next = STATUS_MAP[action];

  const { rows } = await db.query<{ id: string; status: string; availability: string }>({
    text: `
      UPDATE properties p
      SET status = $1,
          availability = $2,
          archived_at = CASE WHEN $1 = 'inactive' THEN COALESCE(p.archived_at, now()) ELSE NULL END,
          archive_reason = CASE WHEN $1 = 'inactive' THEN COALESCE(NULLIF($5, ''), p.archive_reason, 'Archived from listing status actions') ELSE NULL END,
          updated_at = now()
      WHERE p.id = $3::uuid
        AND (
          $4::text = 'admin'
          OR ($4::text = 'seller' AND p.seller_id = $6::uuid)
          OR (
            $4::text = 'agent'
            AND EXISTS (
              SELECT 1
              FROM agents a
              WHERE a.id = p.agent_id
                AND a.user_id = $6::uuid
            )
          )
        )
      RETURNING p.id, p.status, p.availability
    `,
    values: [next.status, next.availability, id, actor.role, body?.reason || null, actor.userId],
  });

  if (!rows[0]) {
    return NextResponse.json({ error: "Listing not found or access denied." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, property: rows[0] });
}
