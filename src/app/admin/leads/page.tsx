import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireRole'

export default async function AdminLeadsRedirectPage() {
  await requireRole(['admin'])

  redirect('/admin/inquiries')
}