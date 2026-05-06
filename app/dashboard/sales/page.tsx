'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Receipt, Eye, XCircle, CreditCard, Banknote, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

type SaleItem = {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

type Sale = {
  id: string
  total_amount: number
  discount: number
  payment_method: string
  status: 'completed' | 'cancelled' | 'pending'
  notes: string | null
  created_at: string
  cashier_name: string | null
  items: SaleItem[] | null
}

export default function SalesPage() {
  const { t, locale } = useLocale()
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }, [locale])

  const formatDate = useCallback((date: string) => {
    return format(new Date(date), 'PPp', { locale: locale === 'ar' ? ar : undefined })
  }, [locale])

  const fetchSales = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', new Date(dateFrom).toISOString())
      if (dateTo) params.set('to', new Date(dateTo + 'T23:59:59').toISOString())

      const res = await fetch(`/api/sales?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSales(data.sales)
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error)
      toast.error(t('error'))
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, t])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const handleViewDetails = async (saleId: string) => {
    try {
      const res = await fetch(`/api/sales/${saleId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedSale(data.sale)
      }
    } catch {
      toast.error(t('error'))
    }
  }

  const handleCancelSale = async () => {
    if (!cancelSaleId) return

    setIsCancelling(true)
    try {
      const res = await fetch(`/api/sales/${cancelSaleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })

      if (res.ok) {
        toast.success('Sale cancelled and stock restored')
        fetchSales()
      } else {
        toast.error(t('error'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setIsCancelling(false)
      setCancelSaleId(null)
    }
  }

  const getStatusBadge = (status: Sale['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">{t('completed')}</Badge>
      case 'cancelled':
        return <Badge variant="destructive">{t('cancelled')}</Badge>
      case 'pending':
        return <Badge variant="outline">{t('pending')}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('salesHistory')}</h1>
        <p className="text-muted-foreground">View and manage all sales transactions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t('from')}</label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="ps-9"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t('to')}</label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="ps-9"
                />
              </div>
            </div>
            <Button onClick={fetchSales} disabled={isLoading}>
              {isLoading ? <Spinner className="h-4 w-4" /> : t('filter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sales')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : sales.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Receipt className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>{t('noSales')}</EmptyTitle>
              <EmptyDescription>No sales found for the selected period.</EmptyDescription>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>{t('paymentMethod')}</TableHead>
                    <TableHead className="text-end">{t('amount')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-end">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(sale.created_at)}
                      </TableCell>
                      <TableCell>{sale.cashier_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sale.payment_method === 'cash' ? (
                            <Banknote className="h-4 w-4 text-success" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-primary" />
                          )}
                          {sale.payment_method === 'cash' ? t('cash') : t('card')}
                        </div>
                      </TableCell>
                      <TableCell className="text-end font-medium">
                        {formatCurrency(Number(sale.total_amount))}
                      </TableCell>
                      <TableCell>{getStatusBadge(sale.status)}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(sale.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user?.role !== 'cashier' && sale.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setCancelSaleId(sale.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              {selectedSale && `Receipt #${selectedSale.id.substring(0, 8).toUpperCase()}`}
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="space-y-2">
                {selectedSale.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <p>{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(Number(item.subtotal))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 space-y-1">
                {Number(selectedSale.discount) > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>{t('discount')}</span>
                    <span>-{formatCurrency(Number(selectedSale.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>{t('total')}</span>
                  <span>{formatCurrency(Number(selectedSale.total_amount))}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Cashier: {selectedSale.cashier_name || 'Unknown'}</p>
                <p>Payment: {selectedSale.payment_method === 'cash' ? t('cash') : t('card')}</p>
                <p>Date: {formatDate(selectedSale.created_at)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSale(null)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelSaleId} onOpenChange={() => setCancelSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this sale? Stock will be restored for all items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('no')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSale}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCancelling}
            >
              {isCancelling ? <Spinner className="h-4 w-4" /> : t('yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
