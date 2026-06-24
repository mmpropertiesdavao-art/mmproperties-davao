// src/app/property/[slug]/page.tsx
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getPropertyBySlug } from "@/lib/data";
import { db } from "@/lib/supabase/server";
import { nearbyAmenitiesQuery } from "@/lib/postgis/queries";
import { propertyMetadata, propertyJsonLd, breadcrumbJsonLd } from "@/lib/seo/meta";
import { PaymentCalculator } from "@/components/property/PaymentCalculator";
import { DistanceToAmenities } from "@/components/property/DistanceToAmenities";
import { InquiryForm } from "@/components/property/InquiryForm";
import { PropertyMap } from "@/components/property/PropertyMap";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { PropertyViewTracker } from "@/components/property/PropertyViewTracker";
import { PropertyVideos } from "@/components/property/PropertyVideos";
import { CompareButton } from "@/components/compare/CompareButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return {};
  return propertyMetadata(property);
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

  const [{ rows: amenities }, { rows: images }, { rows: videos }] = await Promise.all([
    db.query(nearbyAmenitiesQuery(property.lng, property.lat, 5)),
    db.query<{ url: string; alt_text: string | null }>({
      text: `SELECT url, alt_text FROM property_images WHERE property_id = $1 ORDER BY is_cover DESC, sort_order ASC`,
      values: [property.id],
    }),
    db.query<{ id: string; url: string; videoType: string }>({ text: `SELECT id,url,video_type AS "videoType" FROM property_videos WHERE property_id=$1 ORDER BY id`, values: [property.id] }),
  ]);

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Neighborhoods", url: "/neighborhoods" },
    { name: property.neighborhoodName, url: `/neighborhoods/${property.neighborhoodSlug}` },
    { name: property.title, url: `/property/${property.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <PropertyViewTracker propertyId={property.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(propertyJsonLd(property)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <nav className="mb-4 text-sm text-gray-500">
        Home / Neighborhoods / {property.neighborhoodName} / {property.title}
      </nav>

      {/* Gallery placeholder — wire to property_images via PropertyGallery component */}
      <PropertyGallery images={images.map((image) => ({ url: image.url, altText: image.alt_text }))} title={property.title} />

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className={`rounded-md px-3 py-1 text-xs font-bold text-white ${property.listingIntent === "rent" ? "bg-sky-600" : property.listingIntent === "sale_or_rent" ? "bg-violet-600" : "bg-emerald-700"}`}>{property.listingIntent === "rent" ? "FOR RENT" : property.listingIntent === "sale_or_rent" ? "FOR SALE OR RENT" : "FOR SALE"}</span>
            {property.availability !== "available" && <span className="rounded-md bg-slate-800 px-3 py-1 text-xs font-bold uppercase text-white">{property.availability}</span>}
            {property.financingAvailable && <span className="rounded-md bg-cyan-500 px-3 py-1 text-xs font-bold text-navy-950">FINANCING AVAILABLE</span>}
            {property.assumeBalanceAvailable && <span className="rounded-md bg-orange-500 px-3 py-1 text-xs font-bold text-white">ASSUME BALANCE</span>}
            <CompareButton item={{id:property.id,slug:property.slug,title:property.title,listingIntent:property.listingIntent}} className="relative ml-auto" />
          </div>
          <h1 className="text-2xl font-semibold">{property.title}</h1>
          <p className="mt-1 text-gray-500">
            {property.barangay || property.neighborhoodName}, Davao City
          </p>
          {property.previousPrice && property.previousPrice > property.price && <p className="mt-3 text-sm font-semibold text-red-600"><span className="line-through">PHP {property.previousPrice.toLocaleString("en-PH")}</span> · PRICE DOWN</p>}
          <p className="mt-1 text-3xl font-semibold">PHP {property.price.toLocaleString("en-PH")}</p>
          {property.listingIntent !== "sale" && property.rentPrice && <p className="mt-1 text-xl font-semibold text-sky-700">PHP {property.rentPrice.toLocaleString("en-PH")}/month</p>}
          {property.propertyType === "lot-only" && property.lotAreaSqm && <p className="mt-1 text-sm text-gray-500">PHP {Math.round(property.price / property.lotAreaSqm).toLocaleString("en-PH")}/sqm</p>}

          <div className="mt-4 flex gap-6 text-sm text-gray-600">
            <span>{property.bedrooms ?? "—"} bedrooms</span>
            <span>{property.bathrooms ?? "—"} bathrooms</span>
            <span>{property.floorAreaSqm ?? "—"} sqm floor</span>
            {property.lotAreaSqm && <span>{property.lotAreaSqm} sqm lot</span>}
          </div>

          <p className="mt-6 text-gray-700">{property.description}</p>
          <div className="mt-6 rounded-lg border border-navy-100 bg-white p-4 text-sm"><p className="font-semibold text-navy-900">Listed by {property.agentName || "MM Properties"}</p>{property.agencyName && <p className="text-navy-500">{property.agencyName}</p>}<p className="mt-2 text-xs text-navy-500">{property.daysListed} days on MM Properties · {property.viewCount} views · {property.saveCount} saves</p></div>
          <PropertyVideos videos={videos} />

          {/* Map embed placeholder — reuse MapView with a single pin */}
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-navy-900">Exact listing location</h2>
            <PropertyMap property={{ id: property.id, slug: property.slug, title: property.title, price: property.price, lat: property.lat, lng: property.lng, neighborhoodName: property.neighborhoodName, listingIntent: property.listingIntent, rentPrice: property.rentPrice }} />
          </div>
        </div>

        <div className="space-y-6">
          <PaymentCalculator price={property.price} defaultDownpaymentPercent={property.downpaymentPercent ?? 20} />
          <DistanceToAmenities amenities={amenities} />
          <InquiryForm propertyId={property.id} />
        </div>
      </div>
    </div>
  );
}
