import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { SettingsProvider } from '@/contexts/settings-context'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <SettingsProvider>
      <DashboardShell user={session}>{children}</DashboardShell>
    </SettingsProvider>
  )
}
