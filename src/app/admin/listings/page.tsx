import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'

const listingTools = [
  {
    title: 'All Listings',
    href: '/admin/properties',
    description: 'View, edit, approve, reject, feature, and manage all property listings.',
  },
  {
    title: 'Create New Listing',
    href: '/admin/properties/new',
    description: 'Create a new admin-managed property listing.',
  },
  {
    title: 'Photos',
    href: '/admin/properties/photos',
    description: 'Find a listing and manage its uploaded property photos.',
  },
  {
    title: 'Videos',
    href: '/admin/properties/videos',
    description: 'Find a listing and manage videos or media attached to the property.',
  },
  {
    title: 'Location Pins',
    href: '/admin/properties/locations',
    description: 'Find a listing and manage map pins, coordinates, and location details.',
  },
  {
    title: 'Places & Amenities',
    href: '/admin/places',
    description: 'Manage nearby places, landmarks, schools, malls, and amenities.',
  },
]

export default async function AdminListingsPage() {
  await requireRole(['admin'])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Listings Management
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage listings, photos, videos, location pins, nearby places, and approvals from one area.
            </p>
          </div>

          <Link
            href="/admin"
            className="text-sm font-medium text-gray-700 underline"
          >
            Back to admin
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listingTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-gray-400 hover:shadow-md"
            >
              <h2 className="font-semibold text-gray-900">
                {tool.title}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}