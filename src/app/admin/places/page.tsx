import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type PlaceRow = {
  id: string
  name: string
  category: string | null
  address: string | null
  barangay: string | null
  created_at: string | null
}

export default async function AdminPlacesPage() {
  await requireRole(['admin'])

  const { rows: places } = await db.query<PlaceRow>({
    text: `
      SELECT
        id,
        name,
        category,
        address,
        barangay,
        created_at
      FROM places
      ORDER BY created_at DESC NULLS LAST
      LIMIT 300
    `,
  })

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Places & Amenities
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage nearby places, landmarks, schools, malls, hospitals, and amenities.
            </p>
          </div>

          <Link
            href="/admin/listings"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            Back to Listings
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {places.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-800">
                No places found.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Places and amenities will appear here once they are added.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Barangay</th>
                    <th className="px-4 py-3 font-medium">Address</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {places.map((place) => (
                    <tr key={place.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {place.name}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}