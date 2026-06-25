import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type AdminInquiryRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  created_at: string
  property_id: string
  property_title: string | null
  property_slug: string | null
  seller_id: string | null
  seller_email: string | null
  seller_name: string | null
}

export default async function AdminInquiriesPage() {
  await requireRole(['admin'])

  const { rows: inquiries } = await db.query<AdminInquiryRow>({
    text: `
      SELECT
        i.id,
        i.name,
        i.email,
        i.phone,
        i.message,
        i.created_at,
        i.property_id,
        p.title AS property_title,
        p.slug AS property_slug,
        p.seller_id,
        u.email AS seller_email,
        u.full_name AS seller_name
      FROM inquiries i
      LEFT JOIN properties p ON p.id = i.property_id
      LEFT JOIN users u ON u.id = p.seller_id
      ORDER BY i.created_at DESC
      LIMIT 300
    `,
  })

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              All Inquiries
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Admin view of buyer inquiries across all properties.
            </p>
          </div>

          <Link
            href="/admin"
            className="text-sm font-medium text-gray-700 underline"
          >
            Back to admin
          </Link>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          {inquiries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-800">No inquiries yet.</p>
              <p className="mt-2 text-sm text-gray-500">
                Buyer inquiries will appear here once visitors submit property inquiry forms.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Lead</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Property</th>
                    <th className="px-4 py-3 font-medium">Seller</th>
                    <th className="px-4 py-3 font-medium">Message</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {inquiry.name || 'Unnamed lead'}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {inquiry.email && <div>{inquiry.email}</div>}
                        {inquiry.phone && <div>{inquiry.phone}</div>}
                        {!inquiry.email && !inquiry.phone && (
                          <span className="text-gray-400">No contact info</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {inquiry.property_title || 'Unknown property'}
                        </div>

                        {inquiry.property_slug && (
                          <Link
                            href={`/property/${inquiry.property_slug}`}
                            className="text-xs text-gray-500 underline"
                          >
                            View public listing
                          </Link>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <div>{inquiry.seller_name || 'No seller name'}</div>
                        <div className="text-xs text-gray-500">
                          {inquiry.seller_email || 'No seller email'}
                        </div>
                      </td>

                      <td className="max-w-md px-4 py-3 text-gray-700">
                        {inquiry.message || (
                          <span className="text-gray-400">No message</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(inquiry.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}