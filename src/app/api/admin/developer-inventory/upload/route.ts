import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth/requireRole";

const BUCKET = "property-images";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function imageTypeFor(file: File) {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg" || extension === "jfif") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "avif") return "image/avif";
  return null;
}

function extensionFor(type: string) {
  return type === "image/jpeg" ? "jpg" : type.split("/")[1];
}

export async function POST(request: NextRequest) {
  await requireRole(["admin"]);
  const uploadedPaths: string[] = [];

  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);
    const folder = String(formData.get("folder") || "developer-inventory").replace(/[^a-z0-9-_]/gi, "-");

    if (!files.length) return NextResponse.json({ error: "Choose at least one image." }, { status: 400 });

    const invalid = files.find((file) => !imageTypeFor(file) || file.size > MAX_FILE_BYTES);
    if (invalid) return NextResponse.json({ error: `${invalid.name} must be a JPG, PNG, WebP, or AVIF file under 8 MB.` }, { status: 400 });

    const stamp = Date.now();
    const supabase = getSupabase();
    const uploads = await Promise.all(
      files.map(async (file, index) => {
        const type = imageTypeFor(file)!;
        const path = `developer-inventory/${folder}/${stamp}-${index}-${crypto.randomUUID()}.${extensionFor(type)}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
          contentType: type,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw new Error(`${file.name}: ${error.message}`);
        uploadedPaths.push(path);
        return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }),
    );

    return NextResponse.json({ urls: uploads });
  } catch (error) {
    if (uploadedPaths.length) await getSupabase().storage.from(BUCKET).remove(uploadedPaths);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}
