import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type ColumnRow = {
  column_name: string
}

type PlaceRow = {
  id: string | null
  name: string | null
  category: string | null
  address: string | null
  barangay: string | null
  latitude: number | null
  longitude: number | null
  createdAt: string | null
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
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

function firstExisting(columns: string[], options: string[]) {
  return options.find((option) => columns.includes(option)) || null
}

function selectColumn(
  column: string | null,
  alias: string,
  fallbackSql = 'NULL::text'
) {
  if (!column) {
    return `${fallbackSql} AS ${quoteIdentifier(alias)}`
  }

  return `${quoteIdentifier(column)}::text AS ${quoteIdentifier(alias)}`
}

function selectNumberColumn(column: string | null, alias: string) {
  if (!column) {
    return `NULL::float AS ${quoteIdentifier(alias)}`
  }

  return `${quoteIdentifier(column)}::float AS ${quoteIdentifier(alias)}`
}

export default async function AdminPlacesPage() {
  await requireRole(['admin'])

  let places: PlaceRow[] = []
  let loadError: string | null = null
  let tableMissing = false

  try {
    const exists = await tableExists('places')

    if (!exists) {
      tableMissing = true
    } else {
      const columns = await getTableColumns('places')

      const idColumn = firstExisting(columns, ['id'])
      const nameColumn = firstExisting(columns, [
        'name',
        'title',
        'place_name',
        'amenity_name',
      ])
      const categoryColumn = firstExisting(columns, [
        'category',
        'type',
        'amenity_type',
        'place_type',
      ])
      const addressColumn = firstExisting(columns, [
        'address',
        'street_address',
        'location_address',
        'formatted_address',
      ])
      const barangayColumn = firstExisting(columns, [
        'barangay',
        'district',
        'area',
        'neighborhood',
      ])
      const latitudeColumn = firstExisting(columns, [
        'latitude',
        'lat',
        'map_latitude',
        'location_latitude',
      ])
      const longitudeColumn = firstExisting(columns, [
        'longitude',
        'lng',
        'lon',
        'map_longitude',
        'location_longitude',
      ])
      const createdAtColumn = firstExisting(columns, [
        'created_at',
        'inserted_at',
        'date_created',
      ])

      const orderBy = createdAtColumn
        ? `${quoteIdentifier(createdAtColumn)} DESC NULLS LAST`
        : nameColumn
          ? `${quoteIdentifier(nameColumn)} ASC NULLS LAST`
          : '1'

      const { rows } = await db.query<PlaceRow>({
        text: `
          SELECT
            ${selectColumn(idColumn, 'id')},
            ${selectColumn(nameColumn, 'name')},
            ${selectColumn(categoryColumn, 'category')},
            ${selectColumn(addressColumn, 'address')},
            ${selectColumn(barangayColumn, 'barangay')},
            ${selectNumberColumn(latitudeColumn, 'latitude')},
            ${selectNumberColumn(longitudeColumn, 'longitude')},
            ${selectColumn(createdAtColumn, 'createdAt')}
          FROM places
          ORDER BY ${orderBy}
          LIMIT 500
        `,
      })

      places = rows
    }
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : 'Unknown error while loading places and amenities.'
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Places & Amenities
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage nearby schools, malls, hospitals, landmarks, and amenities used by neighborhood and property pages.
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
              href="/admin"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>

        {tableMissing && (
          <section className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
            <p className="font-semibold">
              The public.places table does not exist yet.
            </p>

            <p className="mt-1">
              This page is ready, but the database table for places and amenities still needs to be created or connected.
            </p>
          </section>
        )}

        {loadError && (
          <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">
              Places failed to load safely.
            </p>

            <p className="mt-1">
              {loadError}
            </p>
          </section>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Places</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {places.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">With Coordinates</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {
                places.filter((place) => {
                  return (
                    Number.isFinite(Number(place.latitude)) &&
                    Number.isFinite(Number(place.longitude))
                  )
                }).length
              }
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Missing Coordinates</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {
                places.filter((place) => {
                  return !(
                    Number.isFinite(Number(place.latitude)) &&
                    Number.isFinite(Number(place.longitude))
                  )
                }).length
              }
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {places.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-800">
                No places or amenities found.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Once places are added to the database, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Barangay / Area</th>
                    <th className="px-4 py-3 font-medium">Address</th>
                    <th className="px-4 py-3 font-medium">Coordinates</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {places.map((place, index) => (
                    <tr key={place.id || `${place.name}-${index}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {place.name || 'Unnamed place'}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {place.category || 'Not set'}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {place.barangay || 'Not set'}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {place.address || 'Not set'}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {Number.isFinite(Number(place.latitude)) &&
                        Number.isFinite(Number(place.longitude))
                          ? `${Number(place.latitude).toFixed(5)}, ${Number(place.longitude).toFixed(5)}`
                          : 'Missing'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}