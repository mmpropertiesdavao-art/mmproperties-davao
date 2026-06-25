import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'
import EditPropertyForm from './EditPropertyForm'

type PropertyRow = {
  id: string
  slug: string
  title: string
  price: number | null
  barangay: string | null
  listing_intent: string | null
  status: string | null
  availability: string | null
  bedrooms: number | null
  bathrooms: number | null
  lot_area_sqm: number | null
  floor_area_sqm: number | null
  description: string | null
}

export default async function SellerPropertyManagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const actor = await requireRole(['seller', 'agent', 'admin'])
  const { id } = await params

  const { rows } = await db.query<PropertyRow>({
    text: `
      SELECT
        id,
        slug,
        title,
        price::float AS price,
        barangay,
        listing_intent,
        status,
        availability,
        bedrooms,
        bathrooms::float AS bathrooms,
        lot_area_sqm::float AS lot_area_sqm,
        floor_area_sqm::float AS floor_area_sqm,
        description
      FROM properties
      WHERE id = $1::uuid
      AND seller_id = $2::uuid
      LIMIT 1
    `,
    values: [id, actor.userId],
  })

  const property = rows[0]

  if (!property) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Property
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Update your listing details.
            </p>
          </div>

          <Link
            href="/seller/properties"
            className="text-sm font-medium text-gray-700 underline"
          >
            Back to listings
          </Link>
        </div>

        <EditPropertyForm property={property} />
      </div>
    </main>
  )
}