import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({
      authenticated: false,
      authError: authError?.message || 'Auth session missing!',
    })
  }

  const { data: publicUser, error: publicUserError } = await supabase
    .from('users')
    .select('id,email,role,created_at,updated_at')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    authenticated: true,
    authUser: {
      id: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
      providers: user.app_metadata?.providers,
    },
    publicUser,
    publicUserError: publicUserError?.message || null,
  })
}