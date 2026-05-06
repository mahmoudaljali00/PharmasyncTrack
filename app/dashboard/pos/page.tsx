'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Camera, 
  ShoppingCart,
  CreditCard,
  Banknote,
  Printer,
  CheckCircle,
} from 'lucide-react'
import type { Product } from '@/lib/db'
import { BarcodeScanner } from '@/components/products/barcode-scanner'
import { ReceiptPrint } from '@/components/pos/receipt-print'

type CartItem = {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
  max_quantity: number
}

export default function POSPage() {
  const { t, locale } = useLocale()
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedSale, setCompletedSale] = useState<{id: string; items: CartItem[]; total: number; discount: number; paymentMethod: string} | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }, [locale])

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setProducts([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products.filter((p: Product) => p.quantity > 0))
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(value)
    }, 300)
  }

  const handleBarcodeScanned = async (barcode: string) => {
    setShowScanner(false)
    
    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcode)}`)
      if (res.ok) {
        const data = await res.json()
        addToCart(data.product)
        toast.success(`Added: ${data.product.name}`)
      } else {
        toast.error('Product not found')
      }
    } catch {
      toast.error('Failed to lookup barcode')
    }
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id)
      
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error('Not enough stock')
          return prev
        }
        return prev.map(item =>
          item.product_id === product.id
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unit_price
              }
            : item
        )
      }
      
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        unit_price: Number(product.selling_price),
        quantity: 1,
        subtotal: Number(product.selling_price),
        max_quantity: product.quantity,
      }]
    })

    setSearch('')
    setProducts([])
    searchRef.current?.focus()
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item
      
      const newQty = item.quantity + delta
      if (newQty < 1 || newQty > item.max_quantity) return item
      
      return {
        ...item,
        quantity: newQty,
        subtotal: newQty * item.unit_price,
      }
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setDiscount('')
  }

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const discountAmount = parseFloat(discount) || 0
  const total = Math.max(0, subtotal - discountAmount)

  const handleCheckout = async () => {
    if (cart.length === 0) return

    setIsProcessing(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          total_amount: total,
          discount: discountAmount,
          payment_method: paymentMethod,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setCompletedSale({
          id: data.sale.id,
          items: cart,
          total,
          discount: discountAmount,
          paymentMethod,
        })
        setShowCheckout(false)
        clearCart()
        toast.success(t('saleCompleted'))
      } else {
        const data = await res.json()
        toast.error(data.error || t('error'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setIsProcessing(false)
    }
  }

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
      {/* Product Search Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle>{t('pos')}</CardTitle>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder={t('searchOrScan')}
                  value={search}
                  onChange={handleSearchChange}
                  className="ps-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => setShowScanner(true)}>
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            ) : products.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-start"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(Number(product.selling_price))}
                      </p>
                    </div>
                    <Badge variant="secondary">{product.quantity} in stock</Badge>
                    <Plus className="h-4 w-4 text-primary flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : search ? (
              <Empty className="py-8">
                <EmptyMedia variant="icon"><Search className="h-8 w-8" /></EmptyMedia>
                <EmptyTitle>{t('noProducts')}</EmptyTitle>
              </Empty>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('searchOrScan')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t('cart')}
              {cart.length > 0 && (
                <Badge variant="secondary" className="ms-auto">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <Empty className="py-8">
                <EmptyMedia variant="icon"><ShoppingCart className="h-8 w-8" /></EmptyMedia>
                <EmptyTitle>{t('emptyCart')}</EmptyTitle>
              </Empty>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.unit_price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product_id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product_id, 1)}
                        disabled={item.quantity >= item.max_quantity}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {cart.length > 0 && (
            <CardFooter className="flex-col gap-4 border-t pt-4">
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('subtotal')}</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{t('discount')}</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0.00"
                    className="w-24 h-8 ms-auto"
                  />
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('total')}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="w-full flex gap-2">
                <Button variant="outline" onClick={clearCart} className="flex-1">
                  {t('cancel')}
                </Button>
                <Button onClick={() => setShowCheckout(true)} className="flex-1">
                  {t('checkout')}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('checkout')}</DialogTitle>
            <DialogDescription>
              Complete the sale by selecting a payment method.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between text-lg font-bold">
              <span>{t('total')}</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('paymentMethod')}</label>
              <Select value={paymentMethod} onValueChange={(v: 'cash' | 'card') => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      {t('cash')}
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {t('card')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCheckout} disabled={isProcessing}>
              {isProcessing ? <Spinner className="h-4 w-4" /> : t('completeSale')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Completed Dialog */}
      <Dialog open={!!completedSale} onOpenChange={() => setCompletedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              {t('saleCompleted')}
            </DialogTitle>
          </DialogHeader>
          {completedSale && (
            <>
              <ReceiptPrint
                saleId={completedSale.id}
                items={completedSale.items}
                subtotal={completedSale.items.reduce((sum, item) => sum + item.subtotal, 0)}
                discount={completedSale.discount}
                total={completedSale.total}
                paymentMethod={completedSale.paymentMethod}
              />
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setCompletedSale(null)}>
                  {t('close')}
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer className="h-4 w-4 me-2" />
                  {t('printReceipt')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
