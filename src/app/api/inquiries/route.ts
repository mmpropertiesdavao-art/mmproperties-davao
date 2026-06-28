export const dynamic = 'force-dynamic';

// src/app/api/inquiries/route.ts
//
// Creates a lead and routes it to the assigned agent (falling back to
// admin if the property has no agent yet — e.g. a seller-direct listing).
// Status always starts at 'new' and moves through the pipeline via PATCH
// on /api/inquiries/[id], never set directly by the client.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { notifyAgent, notifyAdmin } from "@/lib/notifications";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getInquiryColumns() {
  const { rows } = await db.query<{ column_name: string }>({
    text: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'inquiries'
    `,
  });

  return new Set(rows.map((row) => row.column_name));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { propertyId, name, email, phone, message, isRemoteBuyer } = body;

  if (!propertyId || !name || !email) {
    return NextResponse.json({ error: "propertyId, name, and email are required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => undefined } });
  const { data: auth } = await supabase.auth.getUser();

  const columns = await getInquiryColumns();
  const insertColumns = [
    "property_id",
    "name",
    "email",
    "phone",
    "message",
    "is_remote_buyer",
    "agent_id",
    "user_id",
    "status",
  ];
  const selectValues = [
    "$1",
    "$2",
    "$3",
    "$4",
    "$5",
    "$6",
    "p.agent_id",
    "$7::uuid",
    "'new'",
  ];

  if (columns.has("lead_source")) {
    insertColumns.push("lead_source");
    selectValues.push("'website'");
  }

  if (columns.has("assigned_agent_id")) {
    insertColumns.push("assigned_agent_id");
    selectValues.push("p.agent_id");
  }

  if (columns.has("assigned_seller_id")) {
    insertColumns.push("assigned_seller_id");
    selectValues.push("p.seller_id");
  }

  const { rows } = await db.query({
    text: `
      INSERT INTO inquiries (${insertColumns.join(", ")})
      SELECT ${selectValues.join(", ")}
      FROM properties p
      WHERE p.id = $1
      RETURNING id, agent_id
    `,
    values: [propertyId, name, email, phone ?? null, message ?? null, Boolean(isRemoteBuyer), auth.user?.id ?? null],
  });

  const inquiry = rows[0];

  if (inquiry.agent_id) {
    await notifyAgent(inquiry.agent_id, inquiry.id);
  } else {
    await notifyAdmin(inquiry.id);
  }

  return NextResponse.json({ id: inquiry.id, status: "new" }, { status: 201 });
}

