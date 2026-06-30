import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'
import { getLeadPipelineData } from '@/lib/leads/pipeline'

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
  const leadData = await getLeadPipelineData({ role: 'admin', userId: actor.userId })
  const newPropertyLeadCount = leadData.leads.filter((lead) => lead.status === 'new').length
  const { rows: developerInquiryRows } = await db.query<{ count: string }>({
    text: `SELECT COUNT(*)::text AS count FROM developer_project_inquiries WHERE status='new'`,
  })
  const newDeveloperLeadCount = Number(developerInquiryRows[0]?.count || 0)
  const newLeadCount = newPropertyLeadCount + newDeveloperLeadCount

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {newLeadCount > 0 && (
          <Link
            href="/admin/inquiries"
            className="fixed bottom-24 right-5 z-40 flex min-h-14 items-center gap-3 rounded-full bg-red-600 px-5 py-3 text-sm font-extrabold text-white shadow-2xl shadow-red-950/30 ring-4 ring-white transition hover:bg-red-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-700">{newLeadCount}</span>
            New inquiries
          </Link>
        )}

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
          {newLeadCount > 0 && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-bold">You have {newLeadCount} new inquiry{newLeadCount === 1 ? '' : 'ies'}.</p>
              <p className="mt-1">
                {newPropertyLeadCount} property lead{newPropertyLeadCount === 1 ? '' : 's'}
                {newDeveloperLeadCount > 0 ? ` and ${newDeveloperLeadCount} developer project lead${newDeveloperLeadCount === 1 ? '' : 's'}` : ''} need review.
              </p>
            </div>
          )}
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
