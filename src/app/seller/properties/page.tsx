import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type SellerProperty = {
  id: string
  slug: string
  title: string
  price: number | null
  status: string | null
  availability: string | null
  barangay: string | null
  created_at: string
}

function formatPrice(price: number | null) {
  if (!price) return 'Price not set'

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function SellerPropertiesPage() {
  const actor = await requireRole(['seller', 'agent', 'admin'])

  const { rows: properties } = await db.query<SellerProperty>({
    text: `
      SELECT
        id,
        slug,
        title,
        price::float AS price,
        status,
        availability,
        barangay,
        created_at
      FROM properties
      WHERE $2::text = 'admin'
        OR seller_id = $1::uuid
        OR (
          $2::text = 'agent'
          AND EXISTS (
            SELECT 1
            FROM agents a
            WHERE a.id = properties.agent_id
              AND a.user_id = $1::uuid
          )
        )
      ORDER BY created_at DESC
    `,
    values: [actor.userId, actor.role],
  })

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage properties connected to your seller account.
            </p>
          </div>

          <Link
            href="/seller/properties/new"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add Property
          </Link>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          {properties.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-800">No listings yet.</p>
              <p className="mt-2 text-sm text-gray-500">
                Add your first property so it can be reviewed.
              </p>

              <Link
                href="/seller/properties/new"
                className="mt-5 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Add your first property
              </Link>
            </div>
          ) : (
            <div className="responsive-card-table overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Property</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {properties.map((property) => (
                    <tr key={property.id}>
                      <td data-label="Property" className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {property.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {property.slug}
                        </div>
                      </td>

                      <td data-label="Location" className="px-4 py-3 text-gray-700">
                        {property.barangay || 'Not set'}
                      </td>

                      <td data-label="Price" className="px-4 py-3 text-gray-700">
                        {formatPrice(property.price)}
                      </td>

                      <td data-label="Status" className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          {property.status || 'draft'}
                        </span>
                      </td>

                      <td data-label="Action" className="px-4 py-3">
                        <Link
                          href={`/seller/properties/${property.id}`}
                          className="font-medium text-gray-900 underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Link
          href="/seller"
          className="mt-6 inline-flex text-sm font-medium text-gray-700 underline"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
