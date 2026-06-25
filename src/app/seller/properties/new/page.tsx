import { requireRole } from '@/lib/auth/requireRole'
import NewPropertyForm from './NewPropertyForm'

export default async function NewSellerPropertyPage() {
  await requireRole(['seller', 'agent', 'admin'])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Add Property</h1>
          <p className="mt-1 text-sm text-gray-600">
            Submit a property listing for review.
          </p>
        </div>

        <NewPropertyForm />
      </div>
    </main>
  )
}