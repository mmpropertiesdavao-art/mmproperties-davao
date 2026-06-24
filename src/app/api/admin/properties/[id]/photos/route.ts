import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

const BUCKET = "property-images";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await params;
  const { rows } = await db.query({
    text: `
      SELECT pi.id, pi.url, pi.alt_text AS "altText", pi.sort_order AS "sortOrder", pi.is_cover AS "isCover"
      FROM properties p
      LEFT JOIN agents a ON a.id = p.agent_id
      JOIN property_images pi ON pi.property_id = p.id
      WHERE p.id = $1::uuid
        AND ($2 = 'admin' OR ($2 = 'seller' AND p.seller_id = $3::uuid) OR ($2 = 'agent' AND a.user_id = $3::uuid))
      ORDER BY pi.is_cover DESC, pi.sort_order ASC
    `,
    values: [id, actor.role, actor.userId],
  });

  return NextResponse.json(rows);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const photoIds = Array.isArray(body.photoIds)
    ? [...new Set(body.photoIds.map(String))].slice(0, 100)
    : [];
  if (photoIds.length === 0) return NextResponse.json({ error: "Choose at least one photo to delete." }, { status: 400 });

  const { rows: ownedPhotos } = await db.query<{ id: string; url: string }>({
    text: `
      SELECT pi.id, pi.url
      FROM properties p
      LEFT JOIN agents a ON a.id = p.agent_id
      JOIN property_images pi ON pi.property_id = p.id
      WHERE p.id = $1::uuid
        AND pi.id = ANY($2::uuid[])
        AND ($3 = 'admin' OR ($3 = 'seller' AND p.seller_id = $4::uuid) OR ($3 = 'agent' AND a.user_id = $4::uuid))
    `,
    values: [id, photoIds, actor.role, actor.userId],
  });

  if (ownedPhotos.length === 0) return NextResponse.json({ error: "Photos not found or access denied." }, { status: 403 });

  const allowedIds = ownedPhotos.map((photo) => photo.id);
  await db.query({
    text: `DELETE FROM property_images WHERE property_id = $1::uuid AND id = ANY($2::uuid[])`,
    values: [id, allowedIds],
  });

  // If the cover was deleted, promote the first remaining image.
  await db.query({
    text: `
      UPDATE property_images
      SET is_cover = true
      WHERE id = (
        SELECT id FROM property_images
        WHERE property_id = $1::uuid
        ORDER BY sort_order ASC, id ASC
        LIMIT 1
      )
      AND NOT EXISTS (
        SELECT 1 FROM property_images WHERE property_id = $1::uuid AND is_cover = true
      )
    `,
    values: [id],
  });

  const storagePaths = ownedPhotos.map((photo) => storagePathFromPublicUrl(photo.url)).filter((path): path is string => Boolean(path));
  let storageWarning: string | null = null;
  if (storagePaths.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(storagePaths);
    if (error) {
      storageWarning = "The listing records were removed, but some storage files may require cleanup.";
      console.error("Photo storage cleanup failed", error);
    }
  }

  return NextResponse.json({ deletedCount: allowedIds.length, warning: storageWarning });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const photoId = String(body.photoId ?? "");
  if (!photoId) return NextResponse.json({ error: "Choose a photo to use as the cover." }, { status: 400 });

  const { rows } = await db.query<{ id: string }>({
    text: `
      WITH allowed AS MATERIALIZED (
        SELECT pi.id
        FROM properties p
        LEFT JOIN agents a ON a.id = p.agent_id
        JOIN property_images pi ON pi.property_id = p.id
        WHERE p.id = $1::uuid
          AND pi.id = $2::uuid
          AND ($3 = 'admin' OR ($3 = 'seller' AND p.seller_id = $4::uuid) OR ($3 = 'agent' AND a.user_id = $4::uuid))
      ), cleared AS (
        UPDATE property_images
        SET is_cover = false
        WHERE property_id = $1::uuid AND EXISTS (SELECT 1 FROM allowed)
        RETURNING id
      )
      UPDATE property_images
      SET is_cover = true
      WHERE id = (SELECT id FROM allowed)
        AND EXISTS (SELECT 1 FROM cleared)
      RETURNING id
    `,
    values: [id, photoId, actor.role, actor.userId],
  });

  if (!rows[0]) return NextResponse.json({ error: "Photo not found or access denied." }, { status: 403 });
  return NextResponse.json({ success: true, coverPhotoId: rows[0].id });
}

function storagePathFromPublicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const expectedHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
    if (url.hostname !== expectedHost) return null;
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}
