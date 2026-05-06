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
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Receipt } from 'lucide-react'
import type { UserRow } from './users-client'

type Sale = {
  id: string
  total_amount: string | number
  discount: string | number
  payment_method: string
  status: 'completed' | 'cancelled' | 'pending'
  created_at: string
}

type Stats = {
  total_count: number
  total_amount: string | number
  completed_count: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRow | null
}

export function UserSalesDialog({ open, onOpenChange, user }: Props) {
  const { t, locale } = useLocale()
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    fetch(`/api/users/${user.id}/sales`)
      .then((r) => r.ok ? r.json() : { sales: [], stats: null })
      .then((data) => {
        setSales(data.sales || [])
        setStats(data.stats || null)
      })
      .catch(() => { setSales([]); setStats(null) })
      .finally(() => setLoading(false))
  }, [open, user])

  const formatDate = (date: string) =>
    new Date(date).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0)
  }

  const statusColor = (status: string) => {
    if (status === 'completed') return 'default'
    if (status === 'cancelled') return 'destructive'
    return 'secondary'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t('salesHistory')}
          </DialogTitle>
          <DialogDescription>
            {user?.name} ({user?.email})
          </DialogDescription>
        </DialogHeader>

        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{t('totalSales')}</div>
              <div className="text-lg font-semibold mt-1">{formatCurrency(stats.total_amount)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{t('salesCount')}</div>
              <div className="text-lg font-semibold mt-1">{stats.total_count}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{t('completed')}</div>
              <div className="text-lg font-semibold mt-1">{stats.completed_count}</div>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
          ) : sales.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Receipt className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>{t('noSales')}</EmptyTitle>
            </Empty>
          ) : (
            <div className="space-y-2 pr-2">
              {sales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="font-medium">{formatCurrency(sale.total_amount)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(sale.created_at)} · {sale.payment_method}
                    </div>
                  </div>
                  <Badge variant={statusColor(sale.status)}>{t(sale.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
