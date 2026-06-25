'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthBridgePage() {
  const router = useRouter()
  const [message, setMessage] = useState('Completing login...')

  useEffect(() => {
    let mounted = true

    async function bridgeSession() {
      const supabase = createClient()

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        if (mounted) {
          setMessage('No login session found. Redirecting...')
        }

        router.replace('/login')
        return
      }

      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      })

      if (!response.ok) {
        if (mounted) {
          setMessage('Could not create server session. Redirecting...')
        }

        router.replace('/login')
        return
      }

      const syncResponse = await fetch('/api/auth/sync-approved-role', {
        method: 'POST',
        credentials: 'include',
      })

      const syncData = await syncResponse.json().catch(() => null)

      if (!syncResponse.ok) {
        if (mounted) {
          setMessage('Could not sync role. Redirecting...')
        }

        router.replace('/login')
        return
      }

      const role = syncData?.role || 'buyer'

      if (role === 'seller' || role === 'agent' || role === 'admin') {
        router.replace('/seller')
      } else {
        router.replace('/search')
      }
    }

    bridgeSession()

    return () => {
      mounted = false
    }
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="rounded-xl bg-white shadow border p-6 text-center">
        <p className="text-gray-700">{message}</p>
      </div>
    </main>
  )
}