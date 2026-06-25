import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'

export default async function AdminPropertyVideosHubPage() {
  await requireRole(['admin'])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Manage Property Videos
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Select a property from All Listings, then open Manage to edit videos and media.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/properties"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Open All Listings
            </Link>

            <Link
              href="/admin/listings"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Listings Hub
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}