import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

const VALID_STATUSES = new Set(["new", "contacted", "interested", "viewing_scheduled", "closed"]);

async function getInquiryColumns() {
  const { rows } = await db.query<{ column_name: string }>({
    text: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'inquiries'
    `,
  });

  return rows.map((row) => row.column_name);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireRole(["admin"]);

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = String(body.status || "").trim();
  const internalNotes = String(body.internalNotes || "").trim();
  const followUpAt = String(body.followUpAt || "").trim();

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid inquiry status." }, { status: 400 });
  }

  const columns = await getInquiryColumns();
  const setParts = ["status = $1"];
  const values: unknown[] = [status];
  let valueIndex = 2;

  if (columns.includes("internal_notes")) {
    setParts.push(`internal_notes = $${valueIndex}`);
    values.push(internalNotes || null);
    valueIndex += 1;
  }

  if (columns.includes("follow_up_at")) {
    setParts.push(`follow_up_at = $${valueIndex}::timestamptz`);
    values.push(followUpAt || null);
    valueIndex += 1;
  }

  if (columns.includes("updated_at")) {
    setParts.push("updated_at = now()");
  }

  values.push(id);

  const { rows } = await db.query<{ id: string }>({
    text: `
      UPDATE inquiries
      SET ${setParts.join(", ")}
      WHERE id = $${valueIndex}::uuid
      RETURNING id
    `,
    values,
  });

  if (!rows[0]) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id });
}
