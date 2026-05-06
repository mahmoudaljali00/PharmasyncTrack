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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Receipt } from 'lucide-react'
import type { CustomerRow } from './customers-client'

type SaleEntry = {
  id: string
  total_amount: number | string
  discount: number | string
  payment_method: string
  status: 'completed' | 'cancelled' | 'pending'
  created_at: string
  user_name: string | null
  item_count: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerRow | null
}

export function CustomerPurchasesDialog({ open, onOpenChange, customer }: Props) {
  const { t, locale } = useLocale()
  const [sales, setSales] = useState<SaleEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !customer) return

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/customers/${customer.id}/purchases`)
        if (res.ok) {
          const data = await res.json()
          setSales(data.sales)
        }
      } catch (err) {
        console.error('[v0] Fetch customer purchases error:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, customer])

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0)
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const totalSpent = sales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => {
      const v = typeof s.total_amount === 'string' ? parseFloat(s.total_amount) : s.total_amount
      return sum + (v || 0)
    }, 0)

  const statusVariant = (status: SaleEntry['status']) => {
    if (status === 'completed') return 'default'
    if (status === 'cancelled') return 'destructive'
    return 'secondary'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('purchaseHistory')}</DialogTitle>
          <DialogDescription>
            {customer?.name}
            {sales.length > 0 && (
              <span className="ms-2">
                · {sales.length} {t('sales').toLowerCase()} · {formatCurrency(totalSpent)}{' '}
                {t('totalSpent').toLowerCase()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
        ) : sales.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon">
              <Receipt className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>{t('noPurchases')}</EmptyTitle>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('items')}</TableHead>
                  <TableHead>{t('paymentMethod')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-end">{t('total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{formatDate(s.created_at)}</TableCell>
                    <TableCell className="text-sm">{s.item_count}</TableCell>
                    <TableCell className="text-sm capitalize">{s.payment_method}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>{t(s.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-end font-medium">
                      {formatCurrency(s.total_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
