import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

type AppRole = 'buyer' | 'seller' | 'agent' | 'admin'

function getSiteUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  )
}

function normalizeRole(value: unknown): AppRole {
  const role = String(value || '').trim().toLowerCase()

  if (role === 'admin') return 'admin'
  if (role === 'seller') return 'seller'
  if (role === 'agent') return 'agent'

  return 'buyer'
}

function getDashboardPath(role: AppRole) {
  if (role === 'admin') return '/admin'
  if (role === 'seller' || role === 'agent') return '/seller'
  return '/search'
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

  const siteUrl = getSiteUrl(request)

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=Missing auth code`)
  }

  const supabase = await createSupabaseServerClient()

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent(exchangeError.message)}`
    )
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user || !user.email) {
    return NextResponse.redirect(`${siteUrl}/login?error=Unable to read user`)
  }

  const admin = getAdminClient()
  const email = user.email.toLowerCase()

  const { data: existingPublicUser } = await admin
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle()

  let finalRole: AppRole = normalizeRole(existingPublicUser?.role)

  if (!existingPublicUser) {
    const { data: approvedApplication } = await admin
      .from('collaborator_applications')
      .select('requested_role, status, email')
      .ilike('email', email)
      .eq('status', 'approved')
      .maybeSingle()

    const requestedRole = normalizeRole(approvedApplication?.requested_role)

    if (requestedRole === 'seller' || requestedRole === 'agent') {
      finalRole = requestedRole
    } else {
      finalRole = 'buyer'
    }
  }

  await admin.from('users').upsert(
    {
      id: user.id,
      email,
      role: finalRole,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  )

  const redirectPath = next || getDashboardPath(finalRole)

  return NextResponse.redirect(`${siteUrl}${redirectPath}`)
}