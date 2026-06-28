import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'

const contentTools = [
  {
    title: 'Developers',
    href: '/admin/developers',
    description: 'Manage property developers and developer logos/data.',
  },
  {
    title: 'Places',
    href: '/admin/places',
    description: 'Manage places, landmarks, amenities, schools, malls, and hospitals.',
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    description: 'View platform activity, listing performance, and user behavior.',
  },
  {
    title: 'Blog / Guides',
    href: '/admin/blog',
    description: 'Manage buyer guides, educational articles, and SEO content.',
  },
  {
    title: 'Privacy & Terms',
    href: '/admin/legal',
    description: 'Update the public Privacy Policy and Terms of Service linked in the footer.',
  },
]

export default async function AdminContentPage() {
  await requireRole(['admin'])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Content & Analytics
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage site content, places, developers, and analytics.
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
          {contentTools.map((tool) => (
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
