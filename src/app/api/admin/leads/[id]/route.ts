import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await requireRole(["admin"]);
  const { id } = await context.params;
  const type = request.nextUrl.searchParams.get("type") || "lead";
  const table = type === "inquiry" ? "inquiries" : "leads";

  const { rows } = await db.query<{ id: string }>({
    text: `DELETE FROM ${table} WHERE id = $1::uuid RETURNING id`,
    values: [id],
  }).catch(() => ({ rows: [] as { id: string }[] }));

  if (!rows[0]) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
