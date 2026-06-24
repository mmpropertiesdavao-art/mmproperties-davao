// src/app/neighborhoods/[slug]/page.tsx
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getNeighborhoodBySlug } from "@/lib/data";
import { db } from "@/lib/supabase/server";
import { nearbyAmenitiesQuery, combinedFilterSearchQuery } from "@/lib/postgis/queries";
import { neighborhoodMetadata, neighborhoodJsonLd, breadcrumbJsonLd } from "@/lib/seo/meta";
import { PropertyCard } from "@/components/property/PropertyCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhoodBySlug(slug);
  if (!neighborhood) return {};
  return neighborhoodMetadata(neighborhood);
}
export default async function NeighborhoodPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhoodBySlug(slug);
  if (!neighborhood) notFound();

  const [{ rows: amenities }, { rows: listings }] = await Promise.all([
    db.query(nearbyAmenitiesQuery(neighborhood.centroid.lng, neighborhood.centroid.lat, 6)),
    db.query(combinedFilterSearchQuery({ neighborhoodId: neighborhood.id, pageSize: 12 })),
  ]);

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Neighborhoods", url: "/neighborhoods" },
    { name: neighborhood.name, url: `/neighborhoods/${neighborhood.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(neighborhoodJsonLd(neighborhood)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <nav className="mb-4 text-sm text-gray-500">Home / Neighborhoods / {neighborhood.name}</nav>

      <h1 className="text-3xl font-semibold">{neighborhood.name}, Davao City</h1>
      <p className="mt-3 max-w-3xl text-gray-700">{neighborhood.overview}</p>

      {neighborhood.avgPricePerSqm && (
        <p className="mt-4 text-sm text-gray-500">
          Illustrative average price: ₱{neighborhood.avgPricePerSqm.toLocaleString()} per sqm (placeholder estimate — replace with
          verified market data)
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Advantages</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {neighborhood.advantages.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-semibold">Disadvantages</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {neighborhood.disadvantages.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Nearby schools, hospitals &amp; malls</h2>
        <ul className="grid grid-cols-2 gap-2 text-sm text-gray-700 sm:grid-cols-3">
          {amenities.map((a: any) => (
            <li key={a.name}>
              {a.name} — {(a.distance_m / 1000).toFixed(1)} km
            </li>
          ))}
        </ul>
      </div>

      {/* Embedded map placeholder — reuse MapView centered on neighborhood.centroid */}
      <div className="mt-10 h-72 rounded-xl bg-gray-100" />

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Available properties in {neighborhood.name}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {listings.map((p: any) => (
            <PropertyCard
              key={p.id}
              id={p.id}
              slug={p.slug}
              title={p.title}
              price={p.price}
              bedrooms={p.bedrooms}
              bathrooms={p.bathrooms}
              floorAreaSqm={p.floorAreaSqm}
              lotAreaSqm={p.lotAreaSqm}
              coverImageUrl={p.coverImageUrl ?? "/placeholder-property.png"}
              neighborhoodName={neighborhood.name}
              barangay={p.barangay}
              isForeclosed={p.isForeclosed}
              propertyType={p.propertyType}
              listingIntent={p.listingIntent}
              availability={p.availability}
              rentPrice={p.rentPrice}
              financingAvailable={p.financingAvailable}
              assumeBalanceAvailable={p.assumeBalanceAvailable}
              previousPrice={p.previousPrice}
              agentName={p.agentName}
              agencyName={p.agencyName}
              daysListed={p.daysListed}
              viewCount={p.viewCount}
              saveCount={p.saveCount}
            />
          ))}
        </div>
      </div>

      {/* Market trends — render avg_price_per_sqm by quarter as a line chart once
          historical snapshots exist; out of scope for the MVP per the roadmap. */}
    </div>
  );
}
