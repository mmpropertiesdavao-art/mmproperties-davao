import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'
import AdminPropertyEditor from './AdminPropertyEditor'

type ColumnRow = {
  column_name: string
  data_type: string
}

type SellerRow = {
  email: string | null
  full_name: string | null
  role: string | null
}

type ImageRow = {
  url: string | null
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

async function getPropertiesColumns() {
  const { rows } = await db.query<ColumnRow>({
    text: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'properties'
      ORDER BY ordinal_position
    `,
  })

  return rows
}

async function getPropertyImagesConfig() {
  const { rows } = await db.query<{ column_name: string }>({
    text: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'property_images'
      ORDER BY ordinal_position
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

  if (columns.includes('is_cover')) orderParts.push('is_cover DESC')
  if (columns.includes('is_primary')) orderParts.push('is_primary DESC')
  if (columns.includes('sort_order')) orderParts.push('sort_order ASC')
  if (columns.includes('position')) orderParts.push('position ASC')
  if (columns.includes('created_at')) orderParts.push('created_at ASC')

  return {
    urlColumn,
    orderBy: orderParts.length > 0 ? orderParts.join(', ') : '1',
  }
}

async function getPropertyCoverImage(propertyId: string) {
  const config = await getPropertyImagesConfig()

  if (!config) return null

  try {
    const { rows } = await db.query<ImageRow>({
      text: `
        SELECT ${quoteIdentifier(config.urlColumn)}::text AS url
        FROM property_images
        WHERE property_id = $1
        ORDER BY ${config.orderBy}
        LIMIT 1
      `,
      values: [propertyId],
    })

    return rows[0]?.url || null
  } catch {
    return null
  }
}

async function getSellerInfo(sellerId: unknown) {
  if (!sellerId) return null

  try {
    const { rows } = await db.query<SellerRow>({
      text: `
        SELECT email, full_name, role
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      values: [sellerId],
    })

    return rows[0] || null
  } catch {
    return null
  }
}

export default async function AdminPropertyManagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(['admin'])

  const { id } = await params

  const columns = await getPropertiesColumns()
  const columnNames = columns.map((column) => column.column_name)

  const { rows } = await db.query<Record<string, any>>({
    text: `
      SELECT *
      FROM properties
      WHERE id = $1
      LIMIT 1
    `,
    values: [id],
  })

  const property = rows[0]

  if (!property) {
    notFound()
  }

  const [coverImageUrl, seller] = await Promise.all([
    getPropertyCoverImage(id),
    getSellerInfo(property.seller_id),
  ])

  const title = property.title || 'Untitled listing'
  const status = property.status || 'draft'
  const availability = property.availability || 'not set'

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Listing
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Edit price, status, availability, details, and core listing information.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/properties"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
            >
              Back to Manage Listings
            </Link>

            {property.slug && (
              <Link
                href={`/property/${property.slug}`}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                View Public Listing
              </Link>
            )}
          </div>
        </div>

        <section className="mb-6 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="h-48 bg-gray-100">
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  No photo
                </div>
              )}
            </div>

            <div className="space-y-3 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Listing
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {title}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                  {status}
                </span>

                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                  {availability}
                </span>
              </div>

              <div className="border-t pt-3 text-sm text-gray-600">
                <p className="font-medium text-gray-900">Seller / Uploader</p>

                <p className="mt-1">
                  {seller?.full_name || seller?.email || 'No seller found'}
                </p>

                {seller?.role && (
                  <p className="text-xs text-gray-500">
                    Role: {seller.role}
                  </p>
                )}
              </div>

              <div className="border-t pt-3 text-xs text-gray-500">
                <p>ID: {property.id}</p>
                {property.slug && <p>Slug: {property.slug}</p>}
              </div>
            </div>
          </div>

          <AdminPropertyEditor
            property={property}
            columnNames={columnNames}
          />
        </section>
      </div>
    </main>
  )
}