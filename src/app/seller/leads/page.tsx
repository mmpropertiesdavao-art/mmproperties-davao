import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type LeadRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  created_at: string
  property_title: string | null
}

export default async function SellerLeadsPage() {
  const actor = await requireRole(['seller', 'agent', 'admin'])

  const { rows: leads } = await db.query<LeadRow>({
    text: `
      SELECT
        i.id,
        i.name,
        i.email,
        i.phone,
        i.message,
        i.created_at,
        p.title AS property_title
      FROM inquiries i
      JOIN properties p ON p.id = i.property_id
      WHERE p.seller_id = $1::uuid
      ORDER BY i.created_at DESC
      LIMIT 100
    `,
    values: [actor.userId],
  })

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-600">
            Buyer inquiries for your properties.
          </p>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          {leads.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-800">No leads yet.</p>
              <p className="mt-2 text-sm text-gray-500">
                Leads will appear here when buyers inquire about your listings.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {leads.map((lead) => (
                <div key={lead.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {lead.name || 'Unnamed lead'}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Property: {lead.property_title || 'Unknown property'}
                      </p>
                    </div>

                    <p className="text-xs text-gray-500">
                      {new Date(lead.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-1 text-sm text-gray-700">
                    {lead.email && <p>Email: {lead.email}</p>}
                    {lead.phone && <p>Phone: {lead.phone}</p>}
                    {lead.message && <p className="mt-2">Message: {lead.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/seller"
          className="mt-6 inline-flex text-sm font-medium text-gray-700 underline"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}