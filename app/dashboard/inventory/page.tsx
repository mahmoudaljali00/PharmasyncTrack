'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { 
  Boxes, 
  AlertTriangle, 
  Clock, 
  TrendingDown,
  TrendingUp,
  Package,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import type { Product, StockLog } from '@/lib/db'

export default function InventoryPage() {
  const { t, locale } = useLocale()
  const [products, setProducts] = useState<Product[]>([])
  const [stockLogs, setStockLogs] = useState<(StockLog & { product_name: string; user_name: string })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }, [locale])

  const formatDate = useCallback((date: Date | string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true,
      locale: locale === 'ar' ? ar : undefined 
    })
  }, [locale])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [productsRes, logsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/inventory/logs'),
      ])

      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.products)
      }

      if (logsRes.ok) {
        const data = await logsRes.json()
        setStockLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch inventory data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const lowStockProducts = products.filter(p => p.quantity <= p.minimum_stock)
  const expiringProducts = products.filter(p => {
    if (!p.expiry_date) return false
    const expiry = new Date(p.expiry_date)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return expiry <= thirtyDaysFromNow && expiry > new Date()
  })
  const expiredProducts = products.filter(p => {
    if (!p.expiry_date) return false
    return new Date(p.expiry_date) <= new Date()
  })

  const totalInventoryValue = products.reduce(
    (sum, p) => sum + (Number(p.purchase_price) * p.quantity), 
    0
  )

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <TrendingDown className="h-4 w-4 text-destructive" />
      case 'purchase':
      case 'initial':
        return <TrendingUp className="h-4 w-4 text-success" />
      case 'adjustment':
        return <Package className="h-4 w-4 text-warning" />
      case 'return':
        return <TrendingUp className="h-4 w-4 text-primary" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('inventory')}</h1>
        <p className="text-muted-foreground">Monitor stock levels and track inventory changes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inventory Value
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('lowStock')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiring/Expired
            </CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {expiringProducts.length + expiredProducts.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="low-stock">{t('lowStock')} ({lowStockProducts.length})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring ({expiringProducts.length + expiredProducts.length})</TabsTrigger>
          <TabsTrigger value="logs">Stock History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Products Stock</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : products.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon"><Boxes className="h-10 w-10" /></EmptyMedia>
                  <EmptyTitle>{t('noProducts')}</EmptyTitle>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('productName')}</TableHead>
                        <TableHead>{t('category')}</TableHead>
                        <TableHead className="text-end">Stock</TableHead>
                        <TableHead className="text-end">Min Stock</TableHead>
                        <TableHead className="text-end">Value</TableHead>
                        <TableHead>{t('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            {product.category ? (
                              <Badge variant="secondary">{product.category}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-end">{product.quantity}</TableCell>
                          <TableCell className="text-end">{product.minimum_stock}</TableCell>
                          <TableCell className="text-end">
                            {formatCurrency(Number(product.purchase_price) * product.quantity)}
                          </TableCell>
                          <TableCell>
                            {product.quantity <= product.minimum_stock ? (
                              <Badge variant="outline" className="border-warning text-warning">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-success text-success">
                                In Stock
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Low Stock Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon"><AlertTriangle className="h-10 w-10" /></EmptyMedia>
                  <EmptyTitle>No low stock products</EmptyTitle>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('productName')}</TableHead>
                        <TableHead className="text-end">Current Stock</TableHead>
                        <TableHead className="text-end">Min Stock</TableHead>
                        <TableHead className="text-end">To Reorder</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-end text-destructive font-bold">
                            {product.quantity}
                          </TableCell>
                          <TableCell className="text-end">{product.minimum_stock}</TableCell>
                          <TableCell className="text-end">
                            {Math.max(0, product.minimum_stock * 2 - product.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-destructive" />
                Expiring & Expired Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringProducts.length === 0 && expiredProducts.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon"><Clock className="h-10 w-10" /></EmptyMedia>
                  <EmptyTitle>No expiring products</EmptyTitle>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('productName')}</TableHead>
                        <TableHead>{t('expiryDate')}</TableHead>
                        <TableHead className="text-end">{t('quantity')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...expiredProducts, ...expiringProducts].map((product) => {
                        const isExpired = product.expiry_date && new Date(product.expiry_date) <= new Date()
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              {product.expiry_date && format(new Date(product.expiry_date), 'PP', { locale: locale === 'ar' ? ar : undefined })}
                            </TableCell>
                            <TableCell className="text-end">{product.quantity}</TableCell>
                            <TableCell>
                              {isExpired ? (
                                <Badge variant="destructive">Expired</Badge>
                              ) : (
                                <Badge variant="outline" className="border-warning text-warning">
                                  Expiring Soon
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              {stockLogs.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon"><Package className="h-10 w-10" /></EmptyMedia>
                  <EmptyTitle>No stock movements</EmptyTitle>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-end">Change</TableHead>
                        <TableHead className="text-end">New Qty</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.product_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getChangeTypeIcon(log.change_type)}
                              <span className="capitalize">{log.change_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className={`text-end font-medium ${
                            log.quantity_change > 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                          </TableCell>
                          <TableCell className="text-end">{log.new_quantity}</TableCell>
                          <TableCell>{log.user_name || 'System'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(log.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
