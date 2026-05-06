'use client'

import Link from 'next/link'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Package,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Plus,
  BarChart3,
  CreditCard,
  Banknote,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

type DashboardStats = {
  todaySales: number
  totalProducts: number
  lowStockCount: number
  expiringSoonCount: number
  recentSales: Array<{
    id: string
    total_amount: number
    created_at: Date
    payment_method: string
    cashier_name: string | null
  }>
}

export function DashboardContent({ stats }: { stats: DashboardStats }) {
  const { t, locale } = useLocale()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true,
      locale: locale === 'ar' ? ar : undefined 
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard')}</h1>
        <p className="text-muted-foreground">{t('welcomeBack')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('todaySales')}
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todaySales)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalProducts')}
            </CardTitle>
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <Package className="h-4 w-4 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('lowStock')}
            </CardTitle>
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount}</div>
            {stats.lowStockCount > 0 && (
              <p className="text-xs text-warning mt-1">Needs attention</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('expiringProducts')}
            </CardTitle>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Clock className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoonCount}</div>
            {stats.expiringSoonCount > 0 && (
              <p className="text-xs text-destructive mt-1">Within 30 days</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Sales */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('quickActions')}</CardTitle>
            <CardDescription>Common tasks you can perform quickly</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/dashboard/pos">
                <ShoppingCart className="h-5 w-5" />
                <span>{t('newSale')}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/dashboard/products/new">
                <Plus className="h-5 w-5" />
                <span>{t('addProduct')}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/dashboard/reports">
                <BarChart3 className="h-5 w-5" />
                <span>{t('viewReports')}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/dashboard/inventory">
                <Package className="h-5 w-5" />
                <span>{t('inventory')}</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>{t('recentSales')}</CardTitle>
            <CardDescription>Latest completed transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noSales')}
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-background rounded-lg">
                        {sale.payment_method === 'cash' ? (
                          <Banknote className="h-4 w-4 text-success" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {sale.cashier_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(sale.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className="text-sm font-semibold">
                        {formatCurrency(Number(sale.total_amount))}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {sale.payment_method === 'cash' ? t('cash') : t('card')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
