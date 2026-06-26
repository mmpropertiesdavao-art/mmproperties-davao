import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'

const listingSections = [
  {
    title: 'Manage Listings',
    href: '/admin/properties',
    description:
      'Search, edit, approve, reject, mark sold, update price, and manage all property listings.',
  },
  {
    title: 'Add New Listing',
    href: '/admin/listings/new',
    description:
      'Create a new admin listing using the full form with neighborhoods and visual map pinning.',
  },
  {
    title: 'Bulk Import',
    href: '/admin/listings/import',
    description:
      'Import multiple listings at once using the admin bulk upload workflow.',
  },
  {
    title: 'Edit Listings',
    href: '/admin/listings/edit',
    description:
      'Use the older admin listing editor tools if needed.',
  },
  {
    title: 'Locations',
    href: '/admin/locations',
    description:
      'Manage listing location data, coordinates, and map-related tools.',
  },
  {
    title: 'Places & Amenities',
    href: '/admin/places',
    description:
      'Manage nearby places, schools, malls, hospitals, landmarks, and amenities.',
  },
]

export default async function AdminListingsPage() {
  await requireRole(['admin'])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Listings
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage listings, add new properties, edit existing listings, import bulk data, and maintain location/amenity tools.
            </p>
          </div>

          <Link
            href="/admin"
            className="text-sm font-medium text-gray-700 underline"
          >
            Back to admin
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listingSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-gray-400 hover:shadow-md"
            >
              <h2 className="font-semibold text-gray-900">
                {section.title}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                {section.description}
              </p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            Recommended workflow
          </h2>

          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>Use Add New Listing for admin-created listings with multiple neighborhoods and visual map pinning.</li>
            <li>Use Manage Listings to find, edit, mark sold, update price, or archive existing listings.</li>
            <li>Use Places & Amenities to manage nearby schools, malls, hospitals, landmarks, and area data.</li>
          </ol>
        </section>
      </div>
    </main>
  )
}