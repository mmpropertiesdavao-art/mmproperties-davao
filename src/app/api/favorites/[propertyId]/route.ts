import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

const ALL_ROLES = ["buyer", "seller", "agent", "admin"] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const actor = await requireRole([...ALL_ROLES]);
  if (!actor) return NextResponse.json({ favorited: false }, { status: 401 });
  const { propertyId } = await params;
  const { rows } = await db.query({ text: `SELECT 1 FROM favorites WHERE user_id = $1::uuid AND property_id = $2::uuid`, values: [actor.userId, propertyId] });
  return NextResponse.json({ favorited: Boolean(rows[0]) });
}

export async function POST(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const actor = await requireRole([...ALL_ROLES]);
  if (!actor) return NextResponse.json({ error: "Sign in to save properties." }, { status: 401 });
  const { propertyId } = await params;
  await db.query({ text: `INSERT INTO favorites (user_id, property_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`, values: [actor.userId, propertyId] });
  return NextResponse.json({ favorited: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const actor = await requireRole([...ALL_ROLES]);
  if (!actor) return NextResponse.json({ error: "Sign in to manage saved properties." }, { status: 401 });
  const { propertyId } = await params;
  await db.query({ text: `DELETE FROM favorites WHERE user_id = $1::uuid AND property_id = $2::uuid`, values: [actor.userId, propertyId] });
  return NextResponse.json({ favorited: false });
}
