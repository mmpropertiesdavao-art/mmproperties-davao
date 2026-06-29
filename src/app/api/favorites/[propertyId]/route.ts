export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

const ALL_ROLES = ["buyer", "seller", "agent", "admin"] as const;

async function getFavoriteActor() {
  const auth = await getCurrentUserWithRole();
  if (!auth.user || !auth.userId || !auth.role || !ALL_ROLES.includes(auth.role)) return null;
  if (auth.accountStatus === "frozen" || auth.accountStatus === "deactivated") return null;
  return auth;
}

async function ensureFavoritesTable() {
  await db.query({
    text: `
      CREATE TABLE IF NOT EXISTS favorites (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY (user_id, property_id)
      )
    `,
    values: [],
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const actor = await getFavoriteActor();
  if (!actor) return NextResponse.json({ favorited: false });
  const { propertyId } = await params;
  try {
    await ensureFavoritesTable();
    const { rows } = await db.query({ text: `SELECT 1 FROM favorites WHERE user_id = $1::uuid AND property_id = $2::uuid`, values: [actor.userId, propertyId] });
    return NextResponse.json({ favorited: Boolean(rows[0]) });
  } catch (error) {
    console.error("Could not load favorite state", error);
    return NextResponse.json({ favorited: false, error: "Could not load saved state." }, { status: 500 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const actor = await getFavoriteActor();
  if (!actor) return NextResponse.json({ error: "Sign in to save properties." }, { status: 401 });
  const { propertyId } = await params;
  try {
    await ensureFavoritesTable();
    await db.query({ text: `INSERT INTO favorites (user_id, property_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`, values: [actor.userId, propertyId] });
    return NextResponse.json({ favorited: true });
  } catch (error) {
    console.error("Could not save favorite", error);
    return NextResponse.json({ error: "Could not save this property." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const actor = await getFavoriteActor();
  if (!actor) return NextResponse.json({ error: "Sign in to manage saved properties." }, { status: 401 });
  const { propertyId } = await params;
  try {
    await ensureFavoritesTable();
    await db.query({ text: `DELETE FROM favorites WHERE user_id = $1::uuid AND property_id = $2::uuid`, values: [actor.userId, propertyId] });
    return NextResponse.json({ favorited: false });
  } catch (error) {
    console.error("Could not remove favorite", error);
    return NextResponse.json({ error: "Could not remove this saved property." }, { status: 500 });
  }
}
