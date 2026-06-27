import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'

const adminNav = [
  {
    label: 'Dashboard',
    href: '/admin',
  },
  {
    label: 'Listings',
    href: '/admin/listings',
  },
  {
    label: 'Leads',
    href: '/admin/inquiries',
  },
  {
    label: 'Users',
    href: '/admin/users',
  },
  {
    label: 'Applications',
    href: '/admin/collaborators',
  },
  {
    label: 'Places',
    href: '/admin/places',
  },
  {
    label: 'Content',
    href: '/admin/content',
  },
  {
    label: 'Homepage',
    href: '/admin/homepage-carousel',
  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole(['admin'])

  return (
    <>
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {children}
    </>
  )
}
