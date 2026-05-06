'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Activity } from 'lucide-react'
import type { UserRow } from './users-client'

type ActivityLog = {
  id: string
  action: string
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRow | null
}

export function ActivityLogDialog({ open, onOpenChange, user }: Props) {
  const { t, locale } = useLocale()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    fetch(`/api/users/${user.id}/activity`)
      .then((r) => r.ok ? r.json() : { logs: [] })
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [open, user])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const formatAction = (action: string) =>
    action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('activityLog')}
          </DialogTitle>
          <DialogDescription>
            {user?.name} ({user?.email})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
          ) : logs.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Activity className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>{t('noActivity')}</EmptyTitle>
            </Empty>
          ) : (
            <div className="space-y-2 pr-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{formatAction(log.action)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(log.created_at)}
                    </div>
                    {log.ip_address && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t('ipAddress')}: {log.ip_address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
