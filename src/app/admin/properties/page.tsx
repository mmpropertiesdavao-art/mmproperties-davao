import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type AdminPropertyRow = {
  id: string
  slug: string | null
  title: string | null
  price: number | null
  status: string | null
  availability: string | null
  listingIntent: string | null
  barangay: string | null
  sellerEmail: string | null
  sellerName: string | null
  propertyTypeId: string | null
  coverImageUrl: string | null
  createdAt: string | null
}

type ColumnRow = {
  column_name: string
}

function formatPrice(price: number | null) {
  if (!price) return 'Price not set'

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(price)
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

async function getPropertyImagesConfig() {
  const { rows } = await db.query<ColumnRow>({
    text: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'property_images'
    `,
  })

  const columns = rows.map((row) => row.column_name)

  if (!columns.includes('property_id')) {
    return null
  }

  const urlColumn =
    columns.find((column) =>
      ['url', 'image_url', 'public_url', 'storage_url', 'src'].includes(column)
    ) || null

  if (!urlColumn) {
    return null
  }

  const orderParts: string[] = []

  if (columns.includes('is_cover')) {
    orderParts.push('pi.is_cover DESC')
  }

  if (columns.includes('is_primary')) {
    orderParts.push('pi.is_primary DESC')
  }

  if (columns.includes('sort_order')) {
    orderParts.push('pi.sort_order ASC')
  }

  if (columns.includes('position')) {
    orderParts.push('pi.position ASC')
  }

  if (columns.includes('created_at')) {
    orderParts.push('pi.created_at ASC')
  }

  return {
    urlColumn,
    orderBy: orderParts.length > 0 ? orderParts.join(', ') : '1',
  }
}

export default async function AdminPropertiesPage() {
  await requireRole(['admin'])

  let properties: AdminPropertyRow[] = []
  let loadError: string | null = null

  try {
    const imageConfig = await getPropertyImagesConfig()

    const coverImageSql = imageConfig
      ? `
        (
          SELECT pi.${quoteIdentifier(imageConfig.urlColumn)}
          FROM property_images pi
          WHERE pi.property_id = p.id
          ORDER BY ${imageConfig.orderBy}
          LIMIT 1
        ) AS "coverImageUrl"
      `
      : `
        NULL::text AS "coverImageUrl"
      `

    const result = await db.query<AdminPropertyRow>({
      text: `
        SELECT
          p.id,
          p.slug,
          p.title,
          p.price::float AS price,
          p.status,
          p.availability,
          p.listing_intent AS "listingIntent",
          p.barangay,
          u.email AS "sellerEmail",
          u.full_name AS "sellerName",
          p.property_type_id::text AS "propertyTypeId",
          p.created_at AS "createdAt",
          ${coverImageSql}
        FROM properties p
        LEFT JOIN users u ON u.id = p.seller_id
        ORDER BY p.created_at DESC NULLS LAST
        LIMIT 500
      `,
    })

    properties = result.rows
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : 'Unknown error while loading listings.'
  }

  const pendingCount = properties.filter((p) => p.status === 'pending').length
  const activeCount = properties.filter((p) => p.status === 'active').length
  const draftCount = properties.filter((p) => !p.status || p.status === 'draft').length

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Listings
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage all property listings with photos, seller details, status, and availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/listings"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
            >
              Back to Listings
            </Link>

            <Link
              href="/admin/properties/new"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Create New Listing
            </Link>
          </div>
        </div>

        {loadError && (
          <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Listings failed to load safely.</p>
            <p className="mt-1">{loadError}</p>
            <p className="mt-2">
              This means the database schema does not match the expected listing columns.
            </p>
          </section>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Listings</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{properties.length}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending Review</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{pendingCount}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Active</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{activeCount}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Draft / No Status</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{draftCount}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {properties.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-800">No listings found.</p>
              <p className="mt-2 text-sm text-gray-500">
                Listings submitted by sellers or created by admin will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="grid gap-4 p-4 md:grid-cols-[160px_1fr_auto] md:items-center"
                >
                  <div className="h-28 overflow-hidden rounded-xl border bg-gray-100">
                    {property.coverImageUrl ? (
                      <img
                        src={property.coverImageUrl}
                        alt={property.title || 'Property photo'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        No photo
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900">
                        {property.title || 'Untitled listing'}
                      </h2>

                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {property.status || 'draft'}
                      </span>

                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {property.availability || 'not set'}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {property.barangay || 'Location not set'} · {formatPrice(property.price)}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Seller: {property.sellerName || 'No seller name'} · {property.sellerEmail || 'No seller email'}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Slug: {property.slug || 'No slug'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 md:flex-col">
                    {property.slug && (
                      <Link
                        href={`/property/${property.slug}`}
                        className="rounded-lg border px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View
                      </Link>
                    )}

                    <Link
                      href={`/admin/properties/${property.id}`}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-gray-800"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}