'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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

const adminLinks = [
  {
    label: 'Admin Dashboard',
    href: '/admin',
  },
  {
    label: 'Listings',
    href: '/admin/listings',
  },
  {
    label: 'Leads & Inquiries',
    href: '/admin/inquiries',
  },
  {
    label: 'Users & Access',
    href: '/admin/users',
  },
  {
    label: 'Seller Applications',
    href: '/admin/collaborators',
  },
  {
    label: 'Content & Analytics',
    href: '/admin/content',
  },
]

export default function AccountLink() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [open, setOpen] = useState(false)

  const dashboardHref = useMemo(() => getDashboardHref(role), [role])

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession()

      if (!mounted) return

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

        if (!mounted) return

        setRole(data.publicUser?.role || 'buyer')
      } catch {
        if (!mounted) return
        setRole('buyer')
      }

      setLoading(false)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <span className="text-sm text-gray-500">Loading...</span>
  }

  if (!authenticated) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Login
      </Link>
    )
  }

  if (role === 'admin') {
    return (
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Dashboard
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-white shadow-lg">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={dashboardHref}
      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
    >
      Dashboard
    </Link>
  )
}

export { AccountLink }