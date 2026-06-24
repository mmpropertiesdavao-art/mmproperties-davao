export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/requireRole";

const BUCKET = "blog-media";
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: NextRequest) {
  const supabase = getAdminSupabase();
  const actor = await requireRole(["admin"]);
  if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !TYPES.has(file.type) || file.size > MAX_BYTES) return NextResponse.json({ error: "Choose a JPG, PNG, WebP, or AVIF image under 8 MB." }, { status: 400 });
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}