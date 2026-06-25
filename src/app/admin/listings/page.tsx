import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'

const listingSections = [
  {
    title: 'All Listings',
    href: '/admin/properties',
    description:
      'View, edit, approve, reject, feature, and manage all property listings.',
  },
  {
    title: 'Create New Listing',
    href: '/admin/properties/new',
    description:
      'Create a new listing manually from the admin side.',
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
              Manage property listings from one place. Photos, videos, and location pins should be managed inside each listing.
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
            How listing management should work
          </h2>

          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>Open All Listings.</li>
            <li>Select one property.</li>
            <li>Inside that property, manage details, photos, videos, location pins, and approval status.</li>
          </ol>
        </section>
      </div>
    </main>
  )
}