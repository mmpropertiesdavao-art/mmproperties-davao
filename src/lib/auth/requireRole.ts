import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Role = 'buyer' | 'seller' | 'agent' | 'admin'
type AppRole = Role

export async function getCurrentUserWithRole() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      user: null,
      userId: null,
      email: null,
      publicUser: null,
      role: null as AppRole | null,
      accountStatus: null as string | null,
    }
  }

  const { data: publicUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const role = (publicUser?.role || 'buyer') as AppRole
  const accountStatus = publicUser?.account_status || 'active'

  return {
    user,
    userId: user.id,
    email: user.email || null,
    publicUser,
    role,
    accountStatus,
  }
}

export async function requireAuth() {
  const auth = await getCurrentUserWithRole()

  if (!auth.user) {
    redirect('/login')
  }

  if (auth.accountStatus === 'frozen') {
    redirect('/login?error=Your account is frozen. Please contact admin.')
  }

  if (auth.accountStatus === 'deactivated') {
    redirect('/login?error=Your account has been deactivated. Please contact admin.')
  }

  return {
    user: auth.user,
    userId: auth.userId as string,
    email: auth.email,
    publicUser: auth.publicUser,
    role: auth.role as AppRole,
    accountStatus: auth.accountStatus,
  }
}

export async function requireRole(allowedRoles: AppRole[]) {
  const auth = await requireAuth()

  if (!auth.role || !allowedRoles.includes(auth.role)) {
    if (auth.role === 'admin') {
      redirect('/admin')
    }

    if (auth.role === 'seller' || auth.role === 'agent') {
      redirect('/seller')
    }

    redirect('/search')
  }

  return auth
}