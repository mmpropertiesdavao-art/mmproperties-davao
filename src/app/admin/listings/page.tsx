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
    href: '/admin/properties/new',
    description:
      'Create a new admin-managed property listing with neighborhood, price, pin, and status.',
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
              Manage property listings from one place. Photos, videos, location pins, and status should be managed inside each listing.
            </p>
          </div>

          <Link
            href="/admin"
            className="text-sm font-medium text-gray-700 underline"
          >
            Back to admin
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
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
            <li>Use Add New Listing for admin-created listings.</li>
            <li>Use Manage Listings to find and edit existing listings.</li>
            <li>Open one listing to update price, sold status, photos, videos, and location pins.</li>
          </ol>
        </section>
      </div>
    </main>
  )
}