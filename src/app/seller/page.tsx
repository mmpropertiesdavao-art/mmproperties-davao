import { requireRole } from '@/lib/auth/requireRole'

export default async function SellerDashboardPage() {
  const { user, publicUser } = await requireRole(['seller', 'agent', 'admin'])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-2xl bg-white border shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Seller Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Logged in as {user?.email}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Role: {publicUser?.role || 'seller'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white border p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900">My Listings</h2>
            <p className="mt-2 text-sm text-gray-600">
              Manage your approved property listings.
            </p>
          </div>

          <div className="rounded-xl bg-white border p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900">Add Property</h2>
            <p className="mt-2 text-sm text-gray-600">
              Create a new property listing for review.
            </p>
          </div>

          <div className="rounded-xl bg-white border p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900">Leads</h2>
            <p className="mt-2 text-sm text-gray-600">
              View inquiries from interested buyers.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}