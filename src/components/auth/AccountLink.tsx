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
    label: 'Applications',
    href: '/admin/collaborators',
  },
  {
    label: 'Content',
    href: '/admin/content',
  },
]

export default function AccountLink() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const dashboardHref = useMemo(() => getDashboardHref(role), [role])

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
        className="rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        Log in
      </Link>
    )
  }

  if (role === 'admin') {
    return (
      <div
        className="relative flex items-center gap-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          Dashboard
        </Link>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg px-2 py-2 text-sm font-medium text-white hover:bg-white/10"
          aria-label="Open admin dashboard menu"
        >
          ▾
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
        >
          {loggingOut ? 'Logging out...' : 'Log out'}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-white shadow-lg">
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

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="block w-full border-t px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {loggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={dashboardHref}
        className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
      >
        Dashboard
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
      >
        {loggingOut ? 'Logging out...' : 'Log out'}
      </button>
    </div>
  )
}

export { AccountLink }