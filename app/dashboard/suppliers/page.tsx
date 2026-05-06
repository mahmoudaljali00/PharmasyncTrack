import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { SuppliersClient } from '@/components/suppliers/suppliers-client'

export default async function SuppliersPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role !== 'admin') {
    redirect('/dashboard')
  }

  return <SuppliersClient />
}
