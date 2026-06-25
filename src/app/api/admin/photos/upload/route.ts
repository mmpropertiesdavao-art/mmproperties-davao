export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/requireRole";

const BUCKET = "property-images";
const MAX_FILES = 12;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const uploadedPaths: string[] = [];

  try {
    const formData = await req.formData();
    const propertyId = String(formData.get("propertyId") ?? "");
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);

    if (!propertyId || files.length === 0) {
      return NextResponse.json({ error: "Choose a property and at least one image." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Upload no more than ${MAX_FILES} photos at a time.` }, { status: 400 });
    }

    const invalid = files.find((file) => !imageTypeFor(file) || file.size > MAX_FILE_BYTES);
    if (invalid) {
      return NextResponse.json({ error: `${invalid.name} must be a JPG, PNG, WebP, or AVIF file under 8 MB.` }, { status: 400 });
    }

    const { rows: accessRows } = await db.query<{ next_order: number; has_cover: boolean }>({
      text: `
        SELECT
          COALESCE((SELECT MAX(pi.sort_order) + 1 FROM property_images pi WHERE pi.property_id = p.id), 0)::int AS next_order,
          EXISTS(SELECT 1 FROM property_images pi WHERE pi.property_id = p.id AND pi.is_cover) AS has_cover
        FROM properties p
        LEFT JOIN agents a ON a.id = p.agent_id
        WHERE p.id = $1::uuid
          AND ($2::text = 'admin' OR ($2::text = 'seller' AND p.seller_id = $3::uuid) OR ($2::text = 'agent' AND a.user_id = $3::uuid))
      `,
      values: [propertyId, actor.role, actor.userId],
    });

    if (!accessRows[0]) return NextResponse.json({ error: "Listing not found or access denied." }, { status: 403 });

    const stamp = Date.now();
    const uploads = await Promise.all(
      files.map(async (file, index) => {
        const normalizedType = imageTypeFor(file)!;
        const extension = extensionFor(normalizedType);
        const path = `${propertyId}/${stamp}-${index}-${crypto.randomUUID()}.${extension}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error } = await getSupabase().storage.from(BUCKET).upload(path, buffer, {
          contentType: normalizedType,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw new Error(`${file.name}: ${error.message}`);
        uploadedPaths.push(path);
        return { path, name: file.name, index, url: getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
      }),
    );

    const startOrder = accessRows[0].next_order;
    const hasCover = accessRows[0].has_cover;
    await db.query({
      text: `
        INSERT INTO property_images (property_id, url, alt_text, sort_order, is_cover)
        SELECT $1::uuid, item.url, item.alt_text, $2 + item.index, (NOT $3 AND item.index = 0)
        FROM jsonb_to_recordset($4::jsonb) AS item(url text, alt_text text, index int)
      `,
      values: [propertyId, startOrder, hasCover, JSON.stringify(uploads.map((item) => ({ url: item.url, alt_text: item.name, index: item.index })))],
    });

    return NextResponse.json({ success: true, uploaded: uploads.map((item) => item.url) });
  } catch (error) {
    if (uploadedPaths.length > 0) await getSupabase().storage.from(BUCKET).remove(uploadedPaths);
    console.error("Photo upload failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}

function extensionFor(type: string) {
  return type === "image/jpeg" ? "jpg" : type.split("/")[1];
}

function imageTypeFor(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg" || extension === "jfif") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "avif") return "image/avif";
  return null;
}
