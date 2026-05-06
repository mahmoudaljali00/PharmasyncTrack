'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Printer } from 'lucide-react'
import type { Product } from '@/lib/db'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { t, locale } = useLocale()
  const { user } = useAuth()

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory)
      if (showLowStock) params.set('lowStock', 'true')

      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error(t('error'))
    } finally {
      setIsLoading(false)
    }
  }, [search, selectedCategory, showLowStock, t])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/products/categories')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  const handleDelete = async () => {
    if (!deleteId) return
    
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/products/${deleteId}`, { method: 'DELETE' })
      
      if (res.ok) {
        toast.success(t('productDeleted'))
        fetchProducts()
      } else {
        toast.error(t('error'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const isExpiringSoon = (date: Date | null) => {
    if (!date) return false
    const expiryDate = new Date(date)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date()
  }

  const isExpired = (date: Date | null) => {
    if (!date) return false
    return new Date(date) <= new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('products')}</h1>
          <p className="text-muted-foreground">
            {products.length} {t('totalProducts').toLowerCase()}
          </p>
        </div>
        {user?.role !== 'cashier' && (
          <Button asChild>
            <Link href="/dashboard/products/new">
              <Plus className="h-4 w-4 me-2" />
              {t('addNewProduct')}
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchProducts')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? 'default' : 'outline'}
              onClick={() => setShowLowStock(!showLowStock)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {t('lowStock')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('products')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : products.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Package className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>{t('noProducts')}</EmptyTitle>
              <EmptyDescription>
                {user?.role !== 'cashier' && (
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/products/new">
                      <Plus className="h-4 w-4 me-2" />
                      {t('addNewProduct')}
                    </Link>
                  </Button>
                )}
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('productName')}</TableHead>
                    <TableHead>{t('barcode')}</TableHead>
                    <TableHead>{t('category')}</TableHead>
                    <TableHead className="text-end">{t('sellingPrice')}</TableHead>
                    <TableHead className="text-end">{t('quantity')}</TableHead>
                    <TableHead>{t('expiryDate')}</TableHead>
                    <TableHead className="text-end">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        {product.name_ar && (
                          <div className="text-sm text-muted-foreground">{product.name_ar}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.barcode || '-'}
                      </TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="secondary">{product.category}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-end font-medium">
                        {formatCurrency(Number(product.selling_price))}
                      </TableCell>
                      <TableCell className="text-end">
                        <span className={
                          product.quantity <= product.minimum_stock
                            ? 'text-destructive font-medium'
                            : ''
                        }>
                          {product.quantity}
                        </span>
                        {product.quantity <= product.minimum_stock && (
                          <AlertTriangle className="inline ms-1 h-4 w-4 text-warning" />
                        )}
                      </TableCell>
                      <TableCell>
                        {isExpired(product.expiry_date) ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : isExpiringSoon(product.expiry_date) ? (
                          <Badge variant="outline" className="border-warning text-warning">
                            {formatDate(product.expiry_date)}
                          </Badge>
                        ) : (
                          formatDate(product.expiry_date)
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/products/${product.id}/labels`}>
                              <Printer className="h-4 w-4" />
                              <span className="sr-only">{t('printLabel')}</span>
                            </Link>
                          </Button>
                          {user?.role !== 'cashier' && (
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/dashboard/products/${product.id}`}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">{t('edit')}</span>
                              </Link>
                            </Button>
                          )}
                          {user?.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(product.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">{t('delete')}</span>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProduct')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner className="h-4 w-4" /> : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
