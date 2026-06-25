import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdminClient() {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  const actor = await requireRole(['admin'])
  const { id } = await context.params
  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const action = String(body.action || '')
  const reason = String(body.reason || '').trim() || null

  if (!['freeze', 'thaw', 'deactivate', 'activate'].includes(action)) {
    return NextResponse.json({ error: 'Invalid account action.' }, { status: 400 })
  }

  if (actor.userId === id && (action === 'freeze' || action === 'deactivate')) {
    return NextResponse.json(
      { error: 'You cannot freeze or deactivate your own admin account.' },
      { status: 400 }
    )
  }

  const admin = getAdminClient()

  const newStatus =
    action === 'freeze'
      ? 'frozen'
      : action === 'deactivate'
        ? 'deactivated'
        : 'active'

  const frozenAtSql = action === 'freeze' ? 'now()' : 'NULL'
  const deactivatedAtSql = action === 'deactivate' ? 'now()' : 'NULL'

  const banDuration =
    action === 'freeze' || action === 'deactivate'
      ? '876000h'
      : 'none'

  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: banDuration,
  })

  if (authError) {
    return NextResponse.json(
      { error: `Auth update failed: ${authError.message}` },
      { status: 500 }
    )
  }

  const { rows } = await db.query<{ id: string }>({
    text: `
      UPDATE users
      SET
        account_status = $1,
        status_reason = $2,
        frozen_at = ${frozenAtSql},
        deactivated_at = ${deactivatedAtSql},
        updated_at = now()
      WHERE id = $3::uuid
      RETURNING id
    `,
    values: [newStatus, reason, id],
  })

  if (!rows[0]) {
    return NextResponse.json(
      { error: 'User profile not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    ok: true,
    userId: id,
    status: newStatus,
  })
}