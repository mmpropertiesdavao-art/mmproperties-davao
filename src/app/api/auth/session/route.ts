import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      {
        authenticated: false,
        authError: error?.message || 'Auth session missing!',
      },
      { status: 401 }
    )
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const body = await request.json().catch(() => null)

  const accessToken = body?.access_token
  const refreshToken = body?.refresh_token

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Missing access_token or refresh_token',
      },
      { status: 400 }
    )
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) {
    return NextResponse.json(
      {
        authenticated: false,
        error: error.message,
      },
      { status: 401 }
    )
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      {
        authenticated: false,
        error: userError?.message || 'Could not read user after setting session',
      },
      { status: 401 }
    )
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
    },
  })
}