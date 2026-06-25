import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

type AppRole = 'buyer' | 'seller' | 'agent' | 'admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getBaseUrl(request: NextRequest) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/$/, '')
  }

  return request.nextUrl.origin
}

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
    console.error('Role sync application lookup failed:', applicationError)
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
    console.error('Role sync users upsert failed:', userUpsertError)
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
      console.error(
        'Role sync collaborator application link failed:',
        applicationUpdateError
      )
    }
  }

  return finalRole
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const baseUrl = getBaseUrl(request)

  if (error) {
    console.error('OAuth callback error:', error, errorDescription)
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(
        errorDescription || error || 'OAuth login failed'
      )}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Missing OAuth code')}`
    )
  }

  const supabase = await createSupabaseServerClient()

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('OAuth code exchange failed:', exchangeError)
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(exchangeError.message)}`
    )
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    console.error('OAuth getUser failed:', userError)
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(
        userError?.message || 'Unable to read authenticated user'
      )}`
    )
  }

  let role: AppRole = 'buyer'

  try {
    role = await syncApprovedRole({
      authUserId: user.id,
      email: user.email,
    })
  } catch (syncError) {
    console.error('OAuth role sync failed:', syncError)
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(
        'Login succeeded but role sync failed. Check server logs.'
      )}`
    )
  }

  if (role === 'seller' || role === 'agent' || role === 'admin') {
    return NextResponse.redirect(`${baseUrl}/seller`)
  }

  return NextResponse.redirect(`${baseUrl}/search`)
}