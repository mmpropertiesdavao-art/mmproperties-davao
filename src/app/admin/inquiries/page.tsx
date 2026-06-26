import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type SearchParams = {
  q?: string
  sort?: string
  status?: string
}

type ColumnRow = {
  column_name: string
}

type InquiryRow = {
  id: string | null
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  status: string | null
  source: string | null
  propertyId: string | null
  propertyTitle: string | null
  propertySlug: string | null
  sellerName: string | null
  sellerEmail: string | null
  createdAt: string | null
}

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Name A-Z', value: 'name_az' },
  { label: 'Email A-Z', value: 'email_az' },
  { label: 'Status', value: 'status' },
  { label: 'Source', value: 'source' },
]

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Open', value: 'open' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
]

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

function normalizeSearchParams(searchParams?: SearchParams) {
  return {
    q: String(searchParams?.q || '').trim(),
    sort: String(searchParams?.sort || 'newest').trim(),
    status: String(searchParams?.status || 'all').trim(),
  }
}

function firstExisting(columns: string[], options: string[]) {
  return options.find((option) => columns.includes(option)) || null
}

function selectTextColumn(
  tableAlias: string,
  column: string | null,
  alias: string
) {
  if (!column) {
    return `NULL::text AS ${quoteIdentifier(alias)}`
  }

  return `${tableAlias}.${quoteIdentifier(column)}::text AS ${quoteIdentifier(alias)}`
}

function getSortSql(sort: string, columns: {
  createdAtColumn: string | null
  nameColumn: string | null
  emailColumn: string | null
  statusColumn: string | null
  sourceColumn: string | null
}) {
  if (sort === 'oldest' && columns.createdAtColumn) {
    return `i.${quoteIdentifier(columns.createdAtColumn)} ASC NULLS LAST`
  }

  if (sort === 'name_az' && columns.nameColumn) {
    return `i.${quoteIdentifier(columns.nameColumn)} ASC NULLS LAST`
  }

  if (sort === 'email_az' && columns.emailColumn) {
    return `i.${quoteIdentifier(columns.emailColumn)} ASC NULLS LAST`
  }

  if (sort === 'status' && columns.statusColumn) {
    return `i.${quoteIdentifier(columns.statusColumn)} ASC NULLS LAST`
  }

  if (sort === 'source' && columns.sourceColumn) {
    return `i.${quoteIdentifier(columns.sourceColumn)} ASC NULLS LAST`
  }

  if (columns.createdAtColumn) {
    return `i.${quoteIdentifier(columns.createdAtColumn)} DESC NULLS LAST`
  }

  return '1'
}

async function tableExists(tableName: string) {
  const { rows } = await db.query<{ exists: boolean }>({
    text: `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      ) AS "exists"
    `,
    values: [tableName],
  })

  return rows[0]?.exists === true
}

async function getTableColumns(tableName: string) {
  const { rows } = await db.query<ColumnRow>({
    text: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position
    `,
    values: [tableName],
  })

  return rows.map((row) => row.column_name)
}

function buildWhereSql(params: {
  q: string
  status: string
  columns: {
    nameColumn: string | null
    emailColumn: string | null
    phoneColumn: string | null
    messageColumn: string | null
    statusColumn: string | null
    sourceColumn: string | null
    propertyIdColumn: string | null
  }
}) {
  const whereParts: string[] = []
  const values: unknown[] = []
  let index = 1

  if (params.q) {
    const searchParts: string[] = []

    if (params.columns.nameColumn) {
      searchParts.push(`i.${quoteIdentifier(params.columns.nameColumn)}::text ILIKE $${index}`)
    }

    if (params.columns.emailColumn) {
      searchParts.push(`i.${quoteIdentifier(params.columns.emailColumn)}::text ILIKE $${index}`)
    }

    if (params.columns.phoneColumn) {
      searchParts.push(`i.${quoteIdentifier(params.columns.phoneColumn)}::text ILIKE $${index}`)
    }

    if (params.columns.messageColumn) {
      searchParts.push(`i.${quoteIdentifier(params.columns.messageColumn)}::text ILIKE $${index}`)
    }

    if (params.columns.statusColumn) {
      searchParts.push(`i.${quoteIdentifier(params.columns.statusColumn)}::text ILIKE $${index}`)
    }

    if (params.columns.sourceColumn) {
      searchParts.push(`i.${quoteIdentifier(params.columns.sourceColumn)}::text ILIKE $${index}`)
    }

    searchParts.push(`p.title::text ILIKE $${index}`)
    searchParts.push(`p.slug::text ILIKE $${index}`)
    searchParts.push(`u.email::text ILIKE $${index}`)
    searchParts.push(`u.full_name::text ILIKE $${index}`)

    if (searchParts.length > 0) {
      whereParts.push(`(${searchParts.join(' OR ')})`)
      values.push(`%${params.q}%`)
      index += 1
    }
  }

  if (
    params.status &&
    params.status !== 'all' &&
    params.columns.statusColumn
  ) {
    whereParts.push(`i.${quoteIdentifier(params.columns.statusColumn)} = $${index}`)
    values.push(params.status)
    index += 1
  }

  return {
    whereSql: whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '',
    values,
  }
}

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  await requireRole(['admin'])

  const resolvedSearchParams = await searchParams
  const filters = normalizeSearchParams(resolvedSearchParams)

  let inquiries: InquiryRow[] = []
  let loadError: string | null = null
  let tableMissing = false

  let counts = {
    total: 0,
    newCount: 0,
    contacted: 0,
    qualified: 0,
  }

  try {
    const exists = await tableExists('inquiries')

    if (!exists) {
      tableMissing = true
    } else {
      const columns = await getTableColumns('inquiries')

      const idColumn = firstExisting(columns, ['id'])
      const nameColumn = firstExisting(columns, [
        'name',
        'full_name',
        'buyer_name',
        'lead_name',
        'contact_name',
      ])
      const emailColumn = firstExisting(columns, [
        'email',
        'buyer_email',
        'lead_email',
        'contact_email',
      ])
      const phoneColumn = firstExisting(columns, [
        'phone',
        'phone_number',
        'mobile',
        'contact_number',
      ])
      const messageColumn = firstExisting(columns, [
        'message',
        'notes',
        'inquiry',
        'question',
        'comment',
      ])
      const statusColumn = firstExisting(columns, [
        'status',
        'lead_status',
        'inquiry_status',
      ])
      const sourceColumn = firstExisting(columns, [
        'source',
        'lead_source',
        'channel',
      ])
      const propertyIdColumn = firstExisting(columns, [
        'property_id',
        'listing_id',
      ])
      const createdAtColumn = firstExisting(columns, [
        'created_at',
        'inserted_at',
        'submitted_at',
        'date_created',
      ])

      const propertyJoin = propertyIdColumn
        ? `LEFT JOIN properties p ON p.id = i.${quoteIdentifier(propertyIdColumn)}`
        : `LEFT JOIN properties p ON false`

      const sellerJoin = `LEFT JOIN users u ON u.id = p.seller_id`

      const where = buildWhereSql({
        q: filters.q,
        status: filters.status,
        columns: {
          nameColumn,
          emailColumn,
          phoneColumn,
          messageColumn,
          statusColumn,
          sourceColumn,
          propertyIdColumn,
        },
      })

      const { rows } = await db.query<InquiryRow>({
        text: `
          SELECT
            ${selectTextColumn('i', idColumn, 'id')},
            ${selectTextColumn('i', nameColumn, 'name')},
            ${selectTextColumn('i', emailColumn, 'email')},
            ${selectTextColumn('i', phoneColumn, 'phone')},
            ${selectTextColumn('i', messageColumn, 'message')},
            ${selectTextColumn('i', statusColumn, 'status')},
            ${selectTextColumn('i', sourceColumn, 'source')},
            ${selectTextColumn('i', propertyIdColumn, 'propertyId')},
            p.title::text AS "propertyTitle",
            p.slug::text AS "propertySlug",
            u.full_name::text AS "sellerName",
            u.email::text AS "sellerEmail",
            ${selectTextColumn('i', createdAtColumn, 'createdAt')}
          FROM inquiries i
          ${propertyJoin}
          ${sellerJoin}
          ${where.whereSql}
          ORDER BY ${getSortSql(filters.sort, {
            createdAtColumn,
            nameColumn,
            emailColumn,
            statusColumn,
            sourceColumn,
          })}
          LIMIT 500
        `,
        values: where.values,
      })

      inquiries = rows

      const countSelectParts = [
        `COUNT(*)::text AS total`,
      ]

      if (statusColumn) {
        countSelectParts.push(
          `COUNT(*) FILTER (WHERE ${quoteIdentifier(statusColumn)} = 'new')::text AS "newCount"`
        )
        countSelectParts.push(
          `COUNT(*) FILTER (WHERE ${quoteIdentifier(statusColumn)} = 'contacted')::text AS contacted`
        )
        countSelectParts.push(
          `COUNT(*) FILTER (WHERE ${quoteIdentifier(statusColumn)} = 'qualified')::text AS qualified`
        )
      } else {
        countSelectParts.push(`0::text AS "newCount"`)
        countSelectParts.push(`0::text AS contacted`)
        countSelectParts.push(`0::text AS qualified`)
      }

      const countResult = await db.query<{
        total: string
        newCount: string
        contacted: string
        qualified: string
      }>({
        text: `
          SELECT
            ${countSelectParts.join(', ')}
          FROM inquiries
        `,
      })

      counts = {
        total: Number(countResult.rows[0]?.total || 0),
        newCount: Number(countResult.rows[0]?.newCount || 0),
        contacted: Number(countResult.rows[0]?.contacted || 0),
        qualified: Number(countResult.rows[0]?.qualified || 0),
      }
    }
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : 'Unknown error while loading inquiries.'
  }

  const hasActiveFilters =
    Boolean(filters.q) ||
    (filters.status && filters.status !== 'all') ||
    filters.sort !== 'newest'

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Inquiries & Leads
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Search, sort, and review buyer inquiries across property listings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
            >
              Admin Dashboard
            </Link>

            <Link
              href="/admin/properties"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
            >
              Manage Listings
            </Link>
          </div>
        </div>

        {tableMissing && (
          <section className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
            <p className="font-semibold">
              The public.inquiries table does not exist yet.
            </p>

            <p className="mt-1">
              Once buyer inquiry storage is connected, leads will appear here.
            </p>
          </section>
        )}

        {loadError && (
          <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Inquiries failed to load safely.</p>
            <p className="mt-1">{loadError}</p>
          </section>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Leads</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {counts.total}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">New</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {counts.newCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Contacted</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {counts.contacted}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Qualified</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {counts.qualified}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <form
            action="/admin/inquiries"
            className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Search inquiries
              </label>

              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Search name, email, phone, message, property, or seller..."
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
                  href="/admin/inquiries"
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>

          <div className="mt-4 text-sm text-gray-500">
            Showing{' '}
            <span className="font-semibold text-gray-800">
              {inquiries.length}
            </span>{' '}
            result{inquiries.length === 1 ? '' : 's'}.
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {inquiries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-800">
                No inquiries found.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Try changing the search, status, or sort filter.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {inquiries.map((inquiry, index) => (
                <article
                  key={inquiry.id || `${inquiry.email}-${index}`}
                  className="grid gap-4 p-5 lg:grid-cols-[1fr_260px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900">
                        {inquiry.name || 'Unnamed lead'}
                      </h2>

                      {inquiry.status && (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {inquiry.status}
                        </span>
                      )}

                      {inquiry.source && (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {inquiry.source}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      {inquiry.email || 'No email'} · {inquiry.phone || 'No phone'}
                    </div>

                    {inquiry.message && (
                      <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
                        {inquiry.message}
                      </p>
                    )}

                    {inquiry.createdAt && (
                      <p className="mt-3 text-xs text-gray-400">
                        Submitted {new Date(inquiry.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <aside className="rounded-xl border bg-gray-50 p-4 text-sm">
                    <p className="font-semibold text-gray-900">
                      Property
                    </p>

                    <p className="mt-1 text-gray-700">
                      {inquiry.propertyTitle || 'No property linked'}
                    </p>

                    {inquiry.propertySlug && (
                      <Link
                        href={`/property/${inquiry.propertySlug}`}
                        className="mt-2 inline-block text-sm font-medium text-gray-900 underline"
                      >
                        View listing
                      </Link>
                    )}

                    <div className="mt-4 border-t pt-3">
                      <p className="font-semibold text-gray-900">
                        Seller
                      </p>

                      <p className="mt-1 text-gray-700">
                        {inquiry.sellerName || 'No seller name'}
                      </p>

                      <p className="text-xs text-gray-500">
                        {inquiry.sellerEmail || 'No seller email'}
                      </p>
                    </div>
                  </aside>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}