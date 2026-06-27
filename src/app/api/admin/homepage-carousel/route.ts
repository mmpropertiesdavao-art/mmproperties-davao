export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const actor = await requireRole(["admin"]);
  if (!actor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || "");

    if (!id) {
      return NextResponse.json({ error: "Property is required." }, { status: 400 });
    }

    await db.query({
      text: `
        UPDATE properties
        SET carousel_enabled=$1,
            carousel_order=$2,
            updated_at=now()
        WHERE id=$3::uuid
      `,
      values: [Boolean(body.carouselEnabled), Math.max(0, Number(body.carouselOrder) || 100), id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("homepage carousel update failed", error);
    return NextResponse.json({ error: "Could not update carousel listing." }, { status: 500 });
  }
}
