export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPropertyBySlug } from "@/lib/data";
import { nearbyAmenitiesQuery } from "@/lib/postgis/queries";
import { db } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  try {
    const [{ rows: amenities }, { rows: images }, { rows: videos }, { rows: features }] =
      await Promise.all([
        db.query(nearbyAmenitiesQuery(property.lng, property.lat, 5)),
        db.query<{ url: string; alt_text: string | null }>({
          text: `SELECT url, alt_text FROM property_images WHERE property_id=$1 ORDER BY is_cover DESC, sort_order ASC`,
          values: [property.id],
        }),
        db.query<{ id: string; url: string; videoType: string; thumbnailUrl: string | null }>({
          text: `SELECT id,url,thumbnail_url AS "thumbnailUrl",video_type AS "videoType" FROM property_videos WHERE property_id=$1 ORDER BY id`,
          values: [property.id],
        }),
        db.query<{ feature: string }>({
          text: `SELECT feature FROM property_features WHERE property_id=$1 ORDER BY feature`,
          values: [property.id],
        }),
      ]);

    return NextResponse.json({
      property,
      images: images.map((image) => ({ url: image.url, altText: image.alt_text })),
      videos,
      features: features.map((row) => row.feature),
      amenities,
    });
  } catch (error) {
    console.error("property detail failed", error);
    return NextResponse.json({ error: "Could not load property details" }, { status: 500 });
  }
}
