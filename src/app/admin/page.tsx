import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'

export default async function AdminDashboardPage() {
  await requireRole(['admin'])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-2xl bg-white border shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Manage users, listings, applications, inquiries, and platform data.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/users"
            className="rounded-xl bg-white border p-5 shadow-sm hover:border-gray-400 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-gray-900">User Accounts</h2>
            <p className="mt-2 text-sm text-gray-600">
              Freeze, thaw, deactivate, or restore user accounts.
            </p>
          </Link>

          <Link
            href="/admin/inquiries"
            className="rounded-xl bg-white border p-5 shadow-sm hover:border-gray-400 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-gray-900">Inquiries</h2>
            <p className="mt-2 text-sm text-gray-600">
              View all buyer inquiries across all listings.
            </p>
          </Link>

          <Link
            href="/admin/collaborators"
            className="rounded-xl bg-white border p-5 shadow-sm hover:border-gray-400 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-gray-900">Collaborators</h2>
            <p className="mt-2 text-sm text-gray-600">
              Review seller and agent applications.
            </p>
          </Link>

          <Link
            href="/admin/properties"
            className="rounded-xl bg-white border p-5 shadow-sm hover:border-gray-400 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-gray-900">Properties</h2>
            <p className="mt-2 text-sm text-gray-600">
              Manage property listings and approvals.
            </p>
          </Link>

          <Link
            href="/admin/analytics"
            className="rounded-xl bg-white border p-5 shadow-sm hover:border-gray-400 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-gray-900">Analytics</h2>
            <p className="mt-2 text-sm text-gray-600">
              View platform activity and performance.
            </p>
          </Link>
        </div>
      </div>
    </main>
  )
}