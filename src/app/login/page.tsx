'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleGoogleLogin() {
    setLoading(true)
    setErrorMessage(null)

    const supabase = createClient()

    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://mmpropertiesdavao.com'

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    })

    if (error) {
      setLoading(false)
      setErrorMessage(error.message)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Log in to MM Properties Davao
        </h1>

        <p className="text-sm text-gray-600 mb-6">
          Use your approved Google account to access your seller dashboard.
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Redirecting to Google...' : 'Continue with Google'}
        </button>

        <p className="mt-5 text-xs text-gray-500">
          Approved sellers and agents will be redirected to their seller dashboard after login.
        </p>
      </div>
    </main>
  )
}