import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type AdminPropertyRow = {
  id: string
  slug: string
  title: string
  price: number | null
  status: string | null
  availability: string | null
  listingIntent: string | null
  barangay: string | null
  sellerEmail: string | null
  sellerName: string | null
  propertyType: string | null
  createdAt: string | null
}

function formatPrice(price: number | null) {
  if (!price) return 'Price not set'

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function AdminPropertiesPage() {
  await requireRole(['admin'])

  const { rows: properties } = await db.query<AdminPropertyRow>({
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
        pt.name AS "propertyType",
        p.created_at AS "createdAt"
      FROM properties p
      LEFT JOIN users u ON u.id = p.seller_id
      LEFT JOIN property_types pt ON pt.id = p.property_type_id
      ORDER BY p.created_at DESC NULLS LAST
      LIMIT 500
    `,
  })

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              All Listings
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Admin view of all property listings, sellers, status, and availability.
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

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {properties.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-800">
                No listings found.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Listings submitted by sellers or created by admin will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Listing</th>
                    <th className="px-4 py-3 font-medium">Seller</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Availability</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {properties.map((property) => (
                    <tr key={property.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {property.title}
                        </div>

                        <div className="text-xs text-gray-500">
                          {property.slug}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <div>{property.sellerName || 'No seller name'}</div>
                        <div className="text-xs text-gray-500">
                          {property.sellerEmail || 'No seller email'}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {property.propertyType || 'Not set'}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {property.barangay || 'Not set'}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {formatPrice(property.price)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {property.status || 'draft'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {property.availability || 'Not set'}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          {property.slug && (
                            <Link
                              href={`/property/${property.slug}`}
                              className="text-sm font-medium text-gray-900 underline"
                            >
                              View Public
                            </Link>
                          )}

                          <Link
                            href={`/admin/properties/${property.id}`}
                            className="text-sm font-medium text-gray-900 underline"
                          >
                            Manage
                          </Link>
                        </div>
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