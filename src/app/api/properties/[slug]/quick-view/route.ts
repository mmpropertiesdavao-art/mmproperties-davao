import { NextResponse } from "next/server";
import { getPropertyBySlug } from "@/lib/data";
import { db } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ slug: string }>;
  }
) {
  const { slug } = await params;

  const property = await getPropertyBySlug(slug);

  if (!property) {
    return NextResponse.json(
      { error: "Property not found." },
      { status: 404 }
    );
  }

  let images: Array<{ url: string; altText: string | null }> = [];

  try {
    const { rows } = await db.query<{ url: string; alt_text: string | null }>({
      text: `
        SELECT url, alt_text
        FROM property_images
        WHERE property_id = $1
        ORDER BY is_cover DESC, sort_order ASC
      `,
      values: [property.id],
    });

    images = rows.map((image) => ({
      url: image.url,
      altText: image.alt_text,
    }));
  } catch {
    images = [];
  }

  if (images.length === 0 && property.coverImageUrl) {
    images = [
      {
        url: property.coverImageUrl,
        altText: property.title,
      },
    ];
  }

  return NextResponse.json({
    property,
    images,
  });
}