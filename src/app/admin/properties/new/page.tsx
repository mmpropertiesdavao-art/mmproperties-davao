import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'
import AdminNewPropertyForm from './AdminNewPropertyForm'

type Option = {
  id: string
  label: string
}

function getBestLabel(row: Record<string, any>) {
  return (
    row.name ||
    row.title ||
    row.label ||
    row.type ||
    row.slug ||
    row.code ||
    row.id
  )
}

async function getNeighborhoodOptions(): Promise<Option[]> {
  try {
    const { rows } = await db.query<Record<string, any>>({
      text: `
        SELECT *
        FROM neighborhoods
        LIMIT 500
      `,
    })

    return rows
      .filter((row) => row.id)
      .map((row) => ({
        id: String(row.id),
        label: String(getBestLabel(row)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    return []
  }
}

async function getPropertyTypeOptions(): Promise<Option[]> {
  try {
    const { rows } = await db.query<Record<string, any>>({
      text: `
        SELECT *
        FROM property_types
        LIMIT 500
      `,
    })

    return rows
      .filter((row) => row.id)
      .map((row) => ({
        id: String(row.id),
        label: String(getBestLabel(row)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    return []
  }
}

export default async function AdminNewPropertyPage() {
  await requireRole(['admin'])

  const [neighborhoods, propertyTypes] = await Promise.all([
    getNeighborhoodOptions(),
    getPropertyTypeOptions(),
  ])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Add New Listing
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Create a property listing from the admin side.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/properties"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
            >
              Back to Manage Listings
            </Link>

            <Link
              href="/admin/listings"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
            >
              Listings Hub
            </Link>
          </div>
        </div>

        <AdminNewPropertyForm
          neighborhoods={neighborhoods}
          propertyTypes={propertyTypes}
        />
      </div>
    </main>
  )
}