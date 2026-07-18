import { ImageResponse } from "next/og";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mmpropertiesdavao.com";

type OgProperty = {
  slug: string;
  title: string;
  price: number;
  rentPrice: number | null;
  listingIntent: string;
  barangay: string | null;
  neighborhoodName: string | null;
  coverImageUrl: string | null;
};

function absoluteUrl(url?: string | null) {
  if (!url) return `${SITE_URL}/mm-social-preview.png`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function price(property: OgProperty) {
  const value = property.listingIntent === "rent" && property.rentPrice ? property.rentPrice : property.price;
  const suffix = property.listingIntent === "rent" ? "/mo" : "";
  return `PHP ${Math.round(value).toLocaleString("en-PH")}${suffix}`;
}

async function loadProperties(slugs: string[]) {
  if (!slugs.length) return [];
  const { rows } = await db.query<OgProperty>({
    text: `
      SELECT
        p.slug,
        p.title,
        p.price::float AS price,
        p.rent_price::float AS "rentPrice",
        p.listing_intent AS "listingIntent",
        p.barangay,
        n.name AS "neighborhoodName",
        (SELECT url FROM property_images pi WHERE pi.property_id=p.id ORDER BY pi.is_cover DESC, pi.sort_order LIMIT 1) AS "coverImageUrl"
      FROM properties p
      LEFT JOIN neighborhoods n ON n.id=p.neighborhood_id
      WHERE p.slug=ANY($1::text[])
      ORDER BY array_position($1::text[], p.slug)
      LIMIT 4
    `,
    values: [slugs],
  });
  return rows;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slugs = (params.get("slugs") || "").split(",").map((slug) => slug.trim()).filter(Boolean).slice(0, 4);
  const properties = await loadProperties(slugs);

  return new ImageResponse(
    <div style={{ width: "1200px", height: "630px", display: "flex", flexDirection: "column", background: "#061124", color: "white", fontFamily: "Arial, sans-serif", padding: "42px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <div style={{ color: "#d3a93e", fontSize: "24px", fontWeight: 800, letterSpacing: "4px", textTransform: "uppercase" }}>MM Properties</div>
          <div style={{ fontSize: "44px", fontWeight: 900, lineHeight: 1.05 }}>Compare Davao Properties</div>
        </div>
        <div style={{ border: "2px solid rgba(211,169,62,.55)", borderRadius: "999px", padding: "14px 22px", fontSize: "22px", fontWeight: 800 }}>{properties.length || slugs.length || 4} listings</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", flex: 1 }}>
        {(properties.length ? properties : new Array(4).fill(null)).map((property, index) => (
          <div key={property?.slug || index} style={{ position: "relative", overflow: "hidden", borderRadius: "28px", background: "#d8dee8", border: "2px solid rgba(255,255,255,.16)" }}>
            <img src={absoluteUrl(property?.coverImageUrl)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,17,36,0) 36%, rgba(6,17,36,.9) 100%)" }} />
            <div style={{ position: "absolute", left: "18px", right: "18px", bottom: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "inline-flex", alignSelf: "flex-start", borderRadius: "999px", background: "#d3a93e", color: "#061124", padding: "8px 12px", fontSize: "20px", fontWeight: 900 }}>
                {property ? price(property) : "Davao Property"}
              </div>
              <div style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1.12, maxHeight: "52px", overflow: "hidden" }}>{property?.title || "Compare homes, condos, and lots"}</div>
              <div style={{ fontSize: "18px", color: "#dbe7f6" }}>{property ? `${property.barangay || property.neighborhoodName || "Davao City"}, Davao City` : "MM Properties Davao"}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "22px", color: "#dbe7f6", fontSize: "22px", fontWeight: 700 }}>Side-by-side pricing, location, lot area, floor area, bedrooms, bathrooms, and financing signals.</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
