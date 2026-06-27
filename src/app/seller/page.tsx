import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type SellerProperty = {
  id: string
  slug: string
  title: string
  price: number | null
  availability: string | null
  status: string | null
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

export default async function SellerDashboardPage() {
  const actor = await requireRole(['seller', 'agent'])

  const { rows: properties } = await db.query<SellerProperty>({
    text: `
      SELECT
        id,
        slug,
        title,
        price::float AS price,
        availability,
        status,
        barangay,
        created_at
      FROM properties
      WHERE seller_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 20
    `,
    values: [actor.userId],
  })

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-2xl bg-white border shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Seller Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Logged in as {actor.email}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Role: {actor.role}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/seller/properties"
            className="rounded-xl bg-white border p-5 shadow-sm hover:border-gray-400 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-gray-900">My Listings</h2>
            <p className="mt-2 text-sm text-gray-600">
              View and manage your submitted property listings.
            </p>
          </Link>

          <Link
            href="/seller/properties/new"
            className="rounded-xl bg-white border p-5 shadow-sm hover:border-gray-400 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-gray-900">Add Property</h2>
            <p className="mt-2 text-sm text-gray-600">
              Submit a new property listing for review.
            </p>
          </Link>

          <Link
            href="/seller/leads"
            className="rounded-xl bg-white border p-5 shadow-sm hover:border-gray-400 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-gray-900">Leads</h2>
            <p className="mt-2 text-sm text-gray-600">
              View inquiries from interested buyers.
            </p>
          </Link>
        </div>

        <section className="mt-8 rounded-2xl bg-white border shadow-sm p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Recent Listings
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Properties connected to your seller account.
              </p>
            </div>

            <Link
              href="/seller/properties/new"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Add Property
            </Link>
          </div>

          {properties.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
              <p className="text-gray-700 font-medium">
                No listings yet.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Start by submitting your first property listing.
              </p>

              <Link
                href="/seller/properties/new"
                className="mt-5 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Add your first property
              </Link>
            </div>
          ) : (
            <div className="responsive-card-table mt-6 overflow-hidden rounded-xl border">
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
        </section>
      </div>
    </main>
  )
}
