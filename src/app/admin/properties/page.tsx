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

type SearchParams = {
  q?: string
  status?: string
  sort?: string
}

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Draft / No Status', value: 'draft' },
  { label: 'Sold', value: 'sold' },
  { label: 'Archived', value: 'archived' },
]

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Price: high to low', value: 'price_high' },
  { label: 'Price: low to high', value: 'price_low' },
  { label: 'Title: A-Z', value: 'title_az' },
  { label: 'Title: Z-A', value: 'title_za' },
  { label: 'Status', value: 'status' },
]

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

function normalizeSearchParams(searchParams?: SearchParams) {
  return {
    q: String(searchParams?.q || '').trim(),
    status: String(searchParams?.status || 'all').trim(),
    sort: String(searchParams?.sort || 'newest').trim(),
  }
}

function getSortSql(sort: string) {
  if (sort === 'oldest') {
    return 'p.created_at ASC NULLS LAST'
  }

  if (sort === 'price_high') {
    return 'p.price DESC NULLS LAST, p.created_at DESC NULLS LAST'
  }

  if (sort === 'price_low') {
    return 'p.price ASC NULLS LAST, p.created_at DESC NULLS LAST'
  }

  if (sort === 'title_az') {
    return 'p.title ASC NULLS LAST'
  }

  if (sort === 'title_za') {
    return 'p.title DESC NULLS LAST'
  }

  if (sort === 'status') {
    return 'p.status ASC NULLS LAST, p.created_at DESC NULLS LAST'
  }

  return 'p.created_at DESC NULLS LAST'
}

async function getPropertyImagesConfig() {
  const { rows } = await db.query<ColumnRow>({
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

function buildFilters(params: {
  q: string
  status: string
}) {
  const whereParts: string[] = []
  const values: unknown[] = []
  let index = 1

  if (params.q) {
    whereParts.push(`
      (
        p.title ILIKE $${index}
        OR p.slug ILIKE $${index}
        OR p.barangay ILIKE $${index}
        OR p.status ILIKE $${index}
        OR u.email ILIKE $${index}
        OR u.full_name ILIKE $${index}
      )
    `)

    values.push(`%${params.q}%`)
    index += 1
  }

  if (params.status && params.status !== 'all') {
    if (params.status === 'draft') {
      whereParts.push(`(p.status IS NULL OR p.status = 'draft')`)
    } else {
      whereParts.push(`p.status = $${index}`)
      values.push(params.status)
      index += 1
    }
  }

  return {
    whereSql: whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '',
    values,
  }
}

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  await requireRole(['admin'])

  const resolvedSearchParams = await searchParams
  const filters = normalizeSearchParams(resolvedSearchParams)

  let properties: AdminPropertyRow[] = []
  let allCounts = {
    total: 0,
    pending: 0,
    active: 0,
    draft: 0,
  }

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

    const filterQuery = buildFilters({
      q: filters.q,
      status: filters.status,
    })

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
        ${filterQuery.whereSql}
        ORDER BY ${getSortSql(filters.sort)}
        LIMIT 500
      `,
      values: filterQuery.values,
    })

    properties = result.rows

    const countResult = await db.query<{
      total: string
      pending: string
      active: string
      draft: string
    }>({
      text: `
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
          COUNT(*) FILTER (WHERE status = 'active')::text AS active,
          COUNT(*) FILTER (WHERE status IS NULL OR status = 'draft')::text AS draft
        FROM properties
      `,
    })

    allCounts = {
      total: Number(countResult.rows[0]?.total || 0),
      pending: Number(countResult.rows[0]?.pending || 0),
      active: Number(countResult.rows[0]?.active || 0),
      draft: Number(countResult.rows[0]?.draft || 0),
    }
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : 'Unknown error while loading listings.'
  }

  const hasActiveFilters =
    Boolean(filters.q) || (filters.status && filters.status !== 'all') || filters.sort !== 'newest'

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Listings
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Search, sort, edit, mark sold, update price, and manage all property listings.
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
              href="/admin/listings/new"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Add New Listing
            </Link>
          </div>
        </div>

        {loadError && (
          <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Listings failed to load safely.</p>
            <p className="mt-1">{loadError}</p>
          </section>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Listings</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {allCounts.total}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending Review</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {allCounts.pending}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Active</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {allCounts.active}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Draft / No Status</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {allCounts.draft}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]" action="/admin/properties">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Search listings
              </label>

              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Search title, barangay, seller, slug, or status..."
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                name="status"
                defaultValue={filters.status || 'all'}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Sort
              </label>

              <select
                name="sort"
                defaultValue={filters.sort || 'newest'}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Apply
              </button>

              {hasActiveFilters && (
                <Link
                  href="/admin/properties"
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>

          <div className="mt-4 text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-800">{properties.length}</span>{' '}
            result{properties.length === 1 ? '' : 's'}.
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {properties.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-800">
                No listings found.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Try changing the search, status, or sort filter.
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