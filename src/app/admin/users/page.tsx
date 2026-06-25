import Link from 'next/link'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'
import UserStatusActions from './UserStatusActions'

type AdminUserRow = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  account_status: string | null
  status_reason: string | null
  frozen_at: string | null
  deactivated_at: string | null
  created_at: string | null
}

export default async function AdminUsersPage() {
  await requireRole(['admin'])

  const { rows: users } = await db.query<AdminUserRow>({
    text: `
      SELECT
        id,
        email,
        full_name,
        role,
        account_status,
        status_reason,
        frozen_at,
        deactivated_at,
        created_at
      FROM users
      ORDER BY created_at DESC NULLS LAST
      LIMIT 500
    `,
  })

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              User Accounts
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Freeze, thaw, deactivate, or reactivate seller, agent, buyer, and admin accounts.
            </p>
          </div>

          <Link
            href="/admin"
            className="text-sm font-medium text-gray-700 underline"
          >
            Back to admin
          </Link>
        </div>

        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {user.full_name || 'No name'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.email || 'No email'}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">
                      {user.id}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {user.role || 'buyer'}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                      {user.account_status || 'active'}
                    </span>

                    {user.frozen_at && (
                      <div className="mt-1 text-xs text-gray-400">
                        Frozen: {new Date(user.frozen_at).toLocaleString()}
                      </div>
                    )}

                    {user.deactivated_at && (
                      <div className="mt-1 text-xs text-gray-400">
                        Deactivated: {new Date(user.deactivated_at).toLocaleString()}
                      </div>
                    )}
                  </td>

                  <td className="max-w-xs px-4 py-3 text-gray-700">
                    {user.status_reason || (
                      <span className="text-gray-400">No reason</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleString()
                      : 'Unknown'}
                  </td>

                  <td className="px-4 py-3">
                    <UserStatusActions
                      userId={user.id}
                      currentStatus={user.account_status || 'active'}
                      email={user.email || ''}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="p-10 text-center text-gray-500">
              No users found.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}