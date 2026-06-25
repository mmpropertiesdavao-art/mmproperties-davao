import { NextResponse } from 'next/server'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

type AppRole = 'buyer' | 'seller' | 'agent' | 'admin'

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

async function syncApprovedRole(params: {
  authUserId: string
  email: string
}) {
  const { authUserId, email } = params

  const admin = getAdminClient()
  const normalizedEmail = email.trim().toLowerCase()

  let finalRole: AppRole = 'buyer'

  const { data: approvedApplication, error: applicationError } = await admin
    .from('collaborator_applications')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle()

  if (applicationError) {
    console.error('Approved application lookup failed:', applicationError)
  }

  const requestedRole = approvedApplication?.requested_role as AppRole | undefined

  if (
    approvedApplication &&
    (requestedRole === 'seller' ||
      requestedRole === 'agent' ||
      requestedRole === 'admin')
  ) {
    finalRole = requestedRole
  }

  const { error: userUpsertError } = await admin.from('users').upsert(
    {
      id: authUserId,
      email: normalizedEmail,
      role: finalRole,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  )

  if (userUpsertError) {
    throw userUpsertError
  }

  if (approvedApplication?.id) {
    const { error: applicationUpdateError } = await admin
      .from('collaborator_applications')
      .update({
        user_id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approvedApplication.id)

    if (applicationUpdateError) {
      console.error('Application user_id link failed:', applicationUpdateError)
    }
  }

  return finalRole
}

export async function POST() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return NextResponse.json(
      {
        authenticated: false,
        error: authError?.message || 'Auth session missing!',
      },
      { status: 401 }
    )
  }

  try {
    const role = await syncApprovedRole({
      authUserId: user.id,
      email: user.email,
    })

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      role,
    })
  } catch (error) {
    console.error('Role sync failed:', error)

    return NextResponse.json(
      {
        authenticated: true,
        error: error instanceof Error ? error.message : 'Role sync failed',
      },
      { status: 500 }
    )
  }
}