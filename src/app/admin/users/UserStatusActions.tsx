'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  userId: string
  currentStatus: string
  email: string
}

export default function UserStatusActions({
  userId,
  currentStatus,
  email,
}: Props) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function runAction(action: 'freeze' | 'thaw' | 'deactivate' | 'activate') {
    const reason =
      action === 'freeze' || action === 'deactivate'
        ? window.prompt(`Reason for ${action} ${email || 'this user'}?`) || ''
        : ''

    if (
      (action === 'freeze' || action === 'deactivate') &&
      !window.confirm(`Confirm ${action} account: ${email || userId}?`)
    ) {
      return
    }

    setLoadingAction(action)
    setErrorMessage(null)

    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        action,
        reason,
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setErrorMessage(data?.error || `Failed to ${action} user.`)
      setLoadingAction(null)
      return
    }

    setLoadingAction(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'active' && (
          <>
            <button
              type="button"
              onClick={() => runAction('freeze')}
              disabled={Boolean(loadingAction)}
              className="rounded-md border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingAction === 'freeze' ? 'Freezing...' : 'Freeze'}
            </button>

            <button
              type="button"
              onClick={() => runAction('deactivate')}
              disabled={Boolean(loadingAction)}
              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {loadingAction === 'deactivate' ? 'Deactivating...' : 'Deactivate'}
            </button>
          </>
        )}

        {currentStatus === 'frozen' && (
          <>
            <button
              type="button"
              onClick={() => runAction('thaw')}
              disabled={Boolean(loadingAction)}
              className="rounded-md border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingAction === 'thaw' ? 'Thawing...' : 'Thaw'}
            </button>

            <button
              type="button"
              onClick={() => runAction('deactivate')}
              disabled={Boolean(loadingAction)}
              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {loadingAction === 'deactivate' ? 'Deactivating...' : 'Deactivate'}
            </button>
          </>
        )}

        {currentStatus === 'deactivated' && (
          <button
            type="button"
            onClick={() => runAction('activate')}
            disabled={Boolean(loadingAction)}
            className="rounded-md border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingAction === 'activate' ? 'Activating...' : 'Activate'}
          </button>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  )
}