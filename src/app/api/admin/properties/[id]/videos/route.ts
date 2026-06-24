export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

async function actorAndId(params: Promise<{ id: string }>) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  return { actor, id: (await params).id };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, id } = await actorAndId(params);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const { rows } = await db.query({ text: `SELECT pv.id, pv.url, pv.thumbnail_url AS "thumbnailUrl", pv.video_type AS "videoType" FROM property_videos pv JOIN properties p ON p.id=pv.property_id LEFT JOIN agents a ON a.id=p.agent_id WHERE p.id=$1::uuid AND ($2='admin' OR ($2='seller' AND p.seller_id=$3::uuid) OR ($2='agent' AND a.user_id=$3::uuid)) ORDER BY pv.id`, values: [id, actor.role, actor.userId] });
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, id } = await actorAndId(params);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const body = await request.json();
  const url = String(body.url ?? "").trim();
  try { new URL(url); } catch { return NextResponse.json({ error: "Enter a valid video URL." }, { status: 400 }); }
  const { rows } = await db.query({ text: `INSERT INTO property_videos(property_id,url,thumbnail_url,video_type) SELECT p.id,$1,$2,$3 FROM properties p LEFT JOIN agents a ON a.id=p.agent_id WHERE p.id=$4::uuid AND ($5='admin' OR ($5='seller' AND p.seller_id=$6::uuid) OR ($5='agent' AND a.user_id=$6::uuid)) RETURNING id,url,video_type AS "videoType"`, values: [url, body.thumbnailUrl || null, body.videoType || "tour", id, actor.role, actor.userId] });
  if (!rows[0]) return NextResponse.json({ error: "Listing not found or access denied." }, { status: 403 });
  return NextResponse.json(rows[0], { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, id } = await actorAndId(params);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const body = await request.json();
  const { rows } = await db.query({ text: `DELETE FROM property_videos pv WHERE pv.property_id=$1::uuid AND pv.id=$2::uuid AND EXISTS (SELECT 1 FROM properties p LEFT JOIN agents a ON a.id=p.agent_id WHERE p.id=pv.property_id AND ($3='admin' OR ($3='seller' AND p.seller_id=$4::uuid) OR ($3='agent' AND a.user_id=$4::uuid))) RETURNING pv.id`, values: [id, body.videoId, actor.role, actor.userId] });
  return rows[0] ? NextResponse.json({ deleted: true }) : NextResponse.json({ error: "Video not found." }, { status: 404 });
}
