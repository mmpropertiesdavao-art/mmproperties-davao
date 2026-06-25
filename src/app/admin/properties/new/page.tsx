import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'

export default async function AdminNewPropertyPage() {
  await requireRole(['admin'])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Create New Listing
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            This admin create listing form will be connected next. For now, use the seller submission flow or existing admin property tools.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/properties"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Back to All Listings
            </Link>

            <Link
              href="/seller/properties/new"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Use Seller Submit Form
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}