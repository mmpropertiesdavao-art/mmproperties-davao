// src/app/neighborhoods/[slug]/page.tsx
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getNeighborhoodBySlug } from '@/lib/data'
import { db } from '@/lib/supabase/server'
import {
  nearbyAmenitiesQuery,
  combinedFilterSearchQuery,
} from '@/lib/postgis/queries'
import {
  neighborhoodMetadata,
  neighborhoodJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo/meta'
import { PropertyCard } from '@/components/property/PropertyCard'
import NeighborhoodPropertyMap from '@/components/neighborhood/NeighborhoodPropertyMap'

type ListingIntent = 'sale' | 'rent' | 'sale_or_rent'

type PropertyPin = {
  id: string
  title: string
  slug: string | null
  price: number | null
  rentPrice?: number | null
  listingIntent?: ListingIntent | null
  latitude: number
  longitude: number
  neighborhoodName?: string | null
}

type ColumnRow = {
  column_name: string
  data_type: string
  udt_name: string
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

function normalizeListingIntent(value: unknown): ListingIntent {
  const intent = String(value || '').trim().toLowerCase()

  if (intent === 'rent') return 'rent'
  if (intent === 'sale_or_rent') return 'sale_or_rent'

  return 'sale'
}

async function getPropertyPinsFromListings(
  listings: any[],
  neighborhoodName: string
) {
  const propertyIds = listings
    .map((property) => property.id)
    .filter(Boolean)

  if (propertyIds.length === 0) {
    return []
  }

  const { rows: propertyColumns } = await db.query<ColumnRow>({
    text: `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'properties'
    `,
  })

  const columns = propertyColumns.map((row) => row.column_name)

  const latColumn =
    columns.find((column) =>
      [
        'latitude',
        'lat',
        'map_latitude',
        'location_latitude',
      ].includes(column)
    ) || null

  const lngColumn =
    columns.find((column) =>
      [
        'longitude',
        'lng',
        'lon',
        'map_longitude',
        'location_longitude',
      ].includes(column)
    ) || null

  let latitudeExpression: string | null = null
  let longitudeExpression: string | null = null
  let coordinateWhere: string | null = null

  if (latColumn && lngColumn) {
    const quotedLat = quoteIdentifier(latColumn)
    const quotedLng = quoteIdentifier(lngColumn)

    latitudeExpression = `p.${quotedLat}::float`
    longitudeExpression = `p.${quotedLng}::float`
    coordinateWhere = `p.${quotedLat} IS NOT NULL AND p.${quotedLng} IS NOT NULL`
  } else {
    const geoColumn = propertyColumns.find((column) => {
      const name = column.column_name.toLowerCase()
      const udt = column.udt_name.toLowerCase()

      return (
        ['geometry', 'geography'].includes(udt) ||
        (
          ['geom', 'geog', 'location', 'coordinates', 'point'].includes(name) &&
          column.data_type.toLowerCase() === 'user-defined'
        )
      )
    })

    if (geoColumn) {
      const quotedGeo = quoteIdentifier(geoColumn.column_name)

      latitudeExpression = `ST_Y(p.${quotedGeo}::geometry)::float`
      longitudeExpression = `ST_X(p.${quotedGeo}::geometry)::float`
      coordinateWhere = `p.${quotedGeo} IS NOT NULL`
    }
  }

  if (!latitudeExpression || !longitudeExpression || !coordinateWhere) {
    return []
  }

  const hasRentPrice = columns.includes('rent_price')
  const hasListingIntent = columns.includes('listing_intent')

  try {
    const { rows } = await db.query<PropertyPin>({
      text: `
        SELECT
          p.id,
          p.title,
          p.slug,
          p.price::float AS price,
          ${hasRentPrice ? 'p.rent_price::float' : 'NULL::float'} AS "rentPrice",
          ${hasListingIntent ? 'p.listing_intent' : "'sale'"} AS "listingIntent",
          ${latitudeExpression} AS latitude,
          ${longitudeExpression} AS longitude,
          $2::text AS "neighborhoodName"
        FROM properties p
        WHERE p.id = ANY($1::uuid[])
        AND ${coordinateWhere}
      `,
      values: [propertyIds, neighborhoodName],
    })

    return rows
      .map((pin) => ({
        ...pin,
        listingIntent: normalizeListingIntent(pin.listingIntent),
      }))
      .filter((pin) => {
        return (
          Number.isFinite(pin.latitude) &&
          Number.isFinite(pin.longitude) &&
          pin.latitude !== 0 &&
          pin.longitude !== 0
        )
      })
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const neighborhood = await getNeighborhoodBySlug(slug)

  if (!neighborhood) return {}

  return neighborhoodMetadata(neighborhood)
}

export default async function NeighborhoodPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const neighborhood = await getNeighborhoodBySlug(slug)

  if (!neighborhood) notFound()

  const [{ rows: amenities }, { rows: listings }] = await Promise.all([
    db.query(
      nearbyAmenitiesQuery(
        neighborhood.centroid.lng,
        neighborhood.centroid.lat,
        6
      )
    ),
    db.query(
      combinedFilterSearchQuery({
        neighborhoodId: neighborhood.id,
        pageSize: 12,
      })
    ),
  ])

  const propertyPins = await getPropertyPinsFromListings(
    listings,
    neighborhood.name
  )

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Neighborhoods', url: '/neighborhoods' },
    {
      name: neighborhood.name,
      url: `/neighborhoods/${neighborhood.slug}`,
    },
  ])

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(neighborhoodJsonLd(neighborhood)),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbs),
        }}
      />

      <nav className="mb-4 text-sm text-gray-500">
        Home / Neighborhoods / {neighborhood.name}
      </nav>

      <h1 className="text-3xl font-semibold">
        {neighborhood.name}, Davao City
      </h1>

      <p className="mt-3 max-w-3xl text-gray-700">
        {neighborhood.overview}
      </p>

      {neighborhood.avgPricePerSqm && (
        <p className="mt-4 text-sm text-gray-500">
          Estimated average price: ₱
          {neighborhood.avgPricePerSqm.toLocaleString()} per sqm
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-semibold">
            Advantages
          </h2>

          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {neighborhood.advantages.map((advantage: string) => (
              <li key={advantage}>{advantage}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">
            Disadvantages
          </h2>

          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {neighborhood.disadvantages.map((disadvantage: string) => (
              <li key={disadvantage}>{disadvantage}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">
          Nearby schools, hospitals &amp; malls
        </h2>

        {amenities.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nearby amenities are not available yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2 md:grid-cols-3">
            {amenities.map((amenity: any) => (
              <li key={amenity.name}>
                {amenity.name} — {(amenity.distance_m / 1000).toFixed(1)} km
              </li>
            ))}
          </ul>
        )}
      </div>

      <NeighborhoodPropertyMap
        pins={propertyPins}
        neighborhoodName={neighborhood.name}
      />

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">
          Available properties in {neighborhood.name}
        </h2>

        {listings.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
            No available properties listed in this neighborhood yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {listings.map((property: any) => (
              <PropertyCard
                key={property.id}
                id={property.id}
                slug={property.slug}
                title={property.title}
                price={property.price}
                bedrooms={property.bedrooms}
                bathrooms={property.bathrooms}
                floorAreaSqm={property.floorAreaSqm}
                lotAreaSqm={property.lotAreaSqm}
                coverImageUrl={
                  property.coverImageUrl ?? '/placeholder-property.png'
                }
                neighborhoodName={neighborhood.name}
                barangay={property.barangay}
                isForeclosed={property.isForeclosed}
                propertyType={property.propertyType}
                listingIntent={property.listingIntent}
                availability={property.availability}
                rentPrice={property.rentPrice}
                financingAvailable={property.financingAvailable}
                assumeBalanceAvailable={property.assumeBalanceAvailable}
                previousPrice={property.previousPrice}
                agentName={property.agentName}
                agencyName={property.agencyName}
                parkingSpaces={property.parkingSpaces}
                daysListed={property.daysListed}
                viewCount={property.viewCount}
                saveCount={property.saveCount}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
