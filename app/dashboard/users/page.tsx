import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { UsersClient } from '@/components/users/users-client'

export default async function UsersPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role !== 'admin') {
    redirect('/dashboard')
  }

  return <UsersClient currentUserId={session.id} />
}
