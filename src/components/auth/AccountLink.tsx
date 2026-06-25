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

export default function AccountLink() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const dashboardHref = useMemo(() => getDashboardHref(role), [role])
  const dashboardLabel = useMemo(() => getDashboardLabel(role), [role])

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
      setOpen(false)
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
    <div
      className="relative flex items-center gap-2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={dashboardHref}
        className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-gray-950 hover:shadow-md"
      >
        Dashboard
      </Link>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg px-2 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-gray-950 hover:shadow-md"
        aria-label="Open dashboard menu"
      >
        ▾
      </button>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="rounded-lg px-3 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-gray-950 hover:shadow-md disabled:opacity-60"
      >
        {loggingOut ? 'Logging out...' : 'Log out'}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border bg-white shadow-xl">
          <Link
            href={dashboardHref}
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            {dashboardLabel}
          </Link>

          {role === 'admin' && (
            <>
              <Link
                href="/admin/listings"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Listings
              </Link>

              <Link
                href="/admin/inquiries"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Leads & Inquiries
              </Link>

              <Link
                href="/admin/users"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Users & Access
              </Link>

              <Link
                href="/admin/collaborators"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Applications
              </Link>

              <Link
                href="/admin/content"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Content
              </Link>
            </>
          )}

          {(role === 'seller' || role === 'agent') && (
            <>
              <Link
                href="/seller/properties"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                My Listings
              </Link>

              <Link
                href="/seller/leads"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Leads
              </Link>
            </>
          )}

          <Link
            href="/account/security"
            onClick={() => setOpen(false)}
            className="block border-t px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            Change Password / Security
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  )
}

export { AccountLink }