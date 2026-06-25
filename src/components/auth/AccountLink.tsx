'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

type Role = 'buyer' | 'seller' | 'agent' | 'admin'

type DebugMeResponse = {
  authenticated: boolean
  authUser?: {
    id: string
    email?: string
  }
  publicUser?: {
    id: string
    email?: string
    role?: Role
  } | null
}

function getDashboardHref(role?: Role | null) {
  if (role === 'admin') return '/admin'
  if (role === 'seller' || role === 'agent') return '/seller'
  return '/search'
}

function getDashboardLabel(role?: Role | null) {
  if (role === 'admin') return 'Admin Dashboard'
  if (role === 'seller' || role === 'agent') return 'Seller Dashboard'
  return 'Dashboard'
}

const adminDashboardLinks = [
  {
    label: 'Dashboard',
    href: '/admin',
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
  },
  {
    label: 'Listings',
    href: '/admin/listings',
  },
  {
    label: 'Manage Listings',
    href: '/admin/properties',
  },
  {
    label: 'New Listing',
    href: '/admin/properties/new',
  },
  {
    label: 'Applications',
    href: '/admin/collaborators',
  },
  {
    label: 'Inquiries / Leads',
    href: '/admin/inquiries',
  },
  {
    label: 'Users & Access',
    href: '/admin/users',
  },
  {
    label: 'Content',
    href: '/admin/content',
  },
]

const sellerDashboardLinks = [
  {
    label: 'Seller Dashboard',
    href: '/seller',
  },
  {
    label: 'My Listings',
    href: '/seller/properties',
  },
  {
    label: 'Add Property',
    href: '/seller/properties/new',
  },
  {
    label: 'Leads',
    href: '/seller/leads',
  },
]

export default function AccountLink() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const dashboardHref = useMemo(() => getDashboardHref(role), [role])
  const dashboardLabel = useMemo(() => getDashboardLabel(role), [role])

  const dashboardLinks =
    role === 'admin'
      ? adminDashboardLinks
      : role === 'seller' || role === 'agent'
        ? sellerDashboardLinks
        : [
            {
              label: 'Search Properties',
              href: '/search',
            },
            {
              label: 'Saved Properties',
              href: '/account/favorites',
            },
          ]

  async function loadUser() {
    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession()

    if (!session) {
      setAuthenticated(false)
      setRole(null)
      setLoading(false)
      return
    }

    setAuthenticated(true)

    try {
      const response = await fetch('/api/debug/me', {
        credentials: 'include',
        cache: 'no-store',
      })

      const data = (await response.json()) as DebugMeResponse

      if (data.authenticated) {
        setRole(data.publicUser?.role || 'buyer')
      } else {
        setRole('buyer')
      }
    } catch {
      setRole('buyer')
    }

    setLoading(false)
  }

  async function handleLogout() {
    setLoggingOut(true)

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      await supabaseBrowser.auth.signOut()
    } finally {
      setAuthenticated(false)
      setRole(null)
      setDashboardOpen(false)
      setAccountOpen(false)
      setLoggingOut(false)
      router.push('/login')
      router.refresh()
    }
  }

  useEffect(() => {
    let mounted = true

    async function safeLoadUser() {
      if (!mounted) return
      await loadUser()
    }

    safeLoadUser()

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(() => {
      safeLoadUser()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <span className="text-sm text-white/70">Loading...</span>
  }

  if (!authenticated) {
    return (
      <Link
        href="/login"
        className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-950 shadow-sm transition hover:shadow-md"
        style={{ backgroundColor: '#d6a536' }}
      >
        Log in
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative"
        onMouseEnter={() => {
          setDashboardOpen(true)
          setAccountOpen(false)
        }}
        onMouseLeave={() => setDashboardOpen(false)}
      >
        <div className="flex items-center">
          <Link
            href={dashboardHref}
            className="rounded-l-lg px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-gray-950 hover:shadow-md"
          >
            Dashboard
          </Link>

          <button
            type="button"
            onClick={() => {
              setDashboardOpen((value) => !value)
              setAccountOpen(false)
            }}
            className="rounded-r-lg px-2 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-gray-950 hover:shadow-md"
            aria-label="Open dashboard menu"
          >
            ▾
          </button>
        </div>

        {dashboardOpen && (
          <div className="absolute right-0 top-full z-50 w-72 rounded-xl border bg-white shadow-xl">
            <div className="h-2" />

            <div className="overflow-hidden rounded-xl">
              <Link
                href={dashboardHref}
                onClick={() => setDashboardOpen(false)}
                className="block px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                {dashboardLabel}
              </Link>

              {dashboardLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDashboardOpen(false)}
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="relative"
        onMouseEnter={() => {
          setAccountOpen(true)
          setDashboardOpen(false)
        }}
        onMouseLeave={() => setAccountOpen(false)}
      >
        <button
          type="button"
          onClick={() => {
            setAccountOpen((value) => !value)
            setDashboardOpen(false)
          }}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-gray-950 hover:shadow-md"
        >
          Account ▾
        </button>

        {accountOpen && (
          <div className="absolute right-0 top-full z-50 w-64 rounded-xl border bg-white shadow-xl">
            <div className="h-2" />

            <div className="overflow-hidden rounded-xl">
              <Link
                href="/account/security"
                onClick={() => setAccountOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Change Password / Security
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="block w-full border-t px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {loggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { AccountLink }