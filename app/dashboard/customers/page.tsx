import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { CustomersClient } from '@/components/customers/customers-client'

export default async function CustomersPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role !== 'admin') {
    redirect('/dashboard')
  }

  return <CustomersClient />
}
