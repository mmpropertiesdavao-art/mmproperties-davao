// src/lib/supabase/client.ts
"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser client — uses the public anon key, scoped by Supabase Storage
// bucket policies (not the service role key, which never ships to the client).
export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PROPERTY_IMAGES_BUCKET = "property-images";

/**
 * Uploads a batch of photo files and returns their public URLs, in order.
 * Used by the listing upload form so agents can just pick files — no
 * manual hosting or URL-pasting required.
 */
export async function uploadPropertyPhotos(propertySlug: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];

  for (const [i, file] of files.entries()) {
    const path = `${propertySlug}/${Date.now()}-${i}-${file.name}`;
    const { error } = await supabaseBrowser.storage.from(PROPERTY_IMAGES_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      console.error("Photo upload failed", file.name, error);
      continue; // skip the failed file rather than aborting the whole batch
    }
    const { data } = supabaseBrowser.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}
