import { ImageResponse } from "next/og";
import { db } from "@/lib/supabase/server";
import { combinedFilterSearchQuery } from "@/lib/postgis/queries";
import type { PropertySearchFilters, PropertyTypeSlug } from "@/types/property";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mmpropertiesdavao.com";
const PROPERTY_TYPES = new Set(["house-and-lot", "condominium", "lot-only", "commercial", "townhouse", "foreclosed"]);

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

function areasFromParams(params: URLSearchParams) {
  const raw = params.getAll("area").concat(params.getAll("location"), params.getAll("preferredArea"), params.getAll("preferredLocation"), params.getAll("areas"));
  return raw.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean).slice(0, 3);
}

function normalizePropertyType(value: string | null): PropertyTypeSlug | undefined {
  const clean = String(value || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");
  const aliases: Record<string, PropertyTypeSlug> = {
    house: "house-and-lot",
    "house-lot": "house-and-lot",
    "house-and-lot": "house-and-lot",
    condo: "condominium",
    condominium: "condominium",
    lot: "lot-only",
    "lot-only": "lot-only",
    commercial: "commercial",
    townhouse: "townhouse",
    foreclosed: "foreclosed",
  };
  const mapped = aliases[clean];
  return mapped && PROPERTY_TYPES.has(mapped) ? mapped : undefined;
}

function price(property: OgProperty) {
  const value = property.listingIntent === "rent" && property.rentPrice ? property.rentPrice : property.price;
  const suffix = property.listingIntent === "rent" ? "/mo" : "";
  return `PHP ${Math.round(value).toLocaleString("en-PH")}${suffix}`;
}

async function loadMatches(params: URLSearchParams) {
  const budget = Number(params.get("budget")) || null;
  const propertyType = normalizePropertyType(params.get("type") || params.get("propertyType"));
  const areas = areasFromParams(params);
  const query = combinedFilterSearchQuery({
    maxPrice: budget || undefined,
    propertyType,
    barangay: areas[0],
    query: areas[0],
    pageSize: 4,
  } satisfies PropertySearchFilters);
  const { rows } = await db.query<OgProperty>(query);
  if (rows.length) return rows.slice(0, 4);
  const fallback = combinedFilterSearchQuery({ maxPrice: budget || undefined, propertyType, pageSize: 4 } satisfies PropertySearchFilters);
  const { rows: fallbackRows } = await db.query<OgProperty>(fallback);
  return fallbackRows.slice(0, 4);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const properties = await loadMatches(params);
  const areas = areasFromParams(params);
  const budget = Number(params.get("budget")) || null;
  const title = areas.length ? `MM Pulse matches near ${areas.join(", ")}` : "MM Pulse Property Matches";

  return new ImageResponse(
    <div style={{ width: "1200px", height: "630px", display: "flex", flexDirection: "column", background: "#061124", color: "white", fontFamily: "Arial, sans-serif", padding: "42px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "22px" }}>
        <div>
          <div style={{ color: "#d3a93e", fontSize: "24px", fontWeight: 900, letterSpacing: "4px", textTransform: "uppercase" }}>MM Pulse</div>
          <div style={{ fontSize: "42px", fontWeight: 900, lineHeight: 1.05, maxWidth: "820px" }}>{title}</div>
          <div style={{ marginTop: "10px", color: "#dbe7f6", fontSize: "22px", fontWeight: 700 }}>{budget ? `Budget up to PHP ${budget.toLocaleString("en-PH")}` : "Smart Davao property recommendations"}</div>
        </div>
        <div style={{ borderRadius: "22px", background: "#d3a93e", color: "#061124", padding: "16px 20px", fontSize: "22px", fontWeight: 900 }}>Davao-first</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", flex: 1 }}>
        {(properties.length ? properties : new Array(4).fill(null)).map((property, index) => (
          <div key={property?.slug || index} style={{ position: "relative", overflow: "hidden", borderRadius: "28px", background: "#d8dee8", border: "2px solid rgba(255,255,255,.16)" }}>
            <img src={absoluteUrl(property?.coverImageUrl)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,17,36,0) 34%, rgba(6,17,36,.92) 100%)" }} />
            <div style={{ position: "absolute", left: "18px", right: "18px", bottom: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "inline-flex", alignSelf: "flex-start", borderRadius: "999px", background: "#d3a93e", color: "#061124", padding: "8px 12px", fontSize: "20px", fontWeight: 900 }}>
                {property ? price(property) : "Matched property"}
              </div>
              <div style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1.12, maxHeight: "52px", overflow: "hidden" }}>{property?.title || "Find a property that fits your life"}</div>
              <div style={{ fontSize: "18px", color: "#dbe7f6" }}>{property ? `${property.barangay || property.neighborhoodName || "Davao City"}, Davao City` : "MM Properties Davao"}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "22px", color: "#dbe7f6", fontSize: "22px", fontWeight: 700 }}>Location, budget, property fit, and buyer priorities in one shortlist.</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
