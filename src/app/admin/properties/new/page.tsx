import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireRole'

export default async function AdminNewPropertyRedirectPage() {
  await requireRole(['admin'])

  redirect('/admin/listings/new')
}