import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireRole'

export default async function AccountSecurityPage() {
  const actor = await requireAuth()

  const dashboardHref =
    actor.role === 'admin'
      ? '/admin'
      : actor.role === 'seller' || actor.role === 'agent'
        ? '/seller'
        : '/search'

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Account Security
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Logged in as {actor.email}.
          </p>

          <div className="mt-6 rounded-xl border bg-gray-50 p-5">
            <h2 className="font-semibold text-gray-900">
              Change Password
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Since the site uses Google login, your password is managed by your Google account.
              To change your password, open your Google Account security settings.
            </p>

            <a
              href="https://myaccount.google.com/security"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Open Google Security
            </a>
          </div>

          <div className="mt-6">
            <Link
              href={dashboardHref}
              className="text-sm font-medium text-gray-700 underline"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}