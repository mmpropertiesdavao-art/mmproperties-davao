import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'

const adminSections = [
  {
    title: 'Listings',
    href: '/admin/listings',
    description:
      'Manage listings, photos, videos, locations, pins, approvals, and featured properties.',
  },
  {
    title: 'Leads & Inquiries',
    href: '/admin/inquiries',
    description:
      'View buyer inquiries across all listings and track property interest.',
  },
  {
    title: 'Users & Access',
    href: '/admin/users',
    description:
      'Freeze, thaw, deactivate, restore accounts, and manage platform access.',
  },
  {
    title: 'Seller Applications',
    href: '/admin/collaborators',
    description:
      'Review and approve seller or agent applications.',
  },
  {
    title: 'Content & Analytics',
    href: '/admin/content',
    description:
      'Manage developers, places, neighborhoods, guides, and analytics.',
  },
]

export default async function AdminDashboardPage() {
  const actor = await requireRole(['admin'])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Admin Control Center
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Logged in as {actor.email}. Manage listings, users, inquiries, applications, and site data from one place.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-gray-400 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-gray-900">
                {section.title}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                {section.description}
              </p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Quick Actions
          </h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin/properties"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Manage Properties
            </Link>

            <Link
              href="/admin/collaborators"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Review Applications
            </Link>

            <Link
              href="/admin/inquiries"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View Inquiries
            </Link>

            <Link
              href="/admin/users"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Manage Users
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}