'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { ArrowLeft, Camera, Barcode } from 'lucide-react'
import type { Product } from '@/lib/db'
import { BarcodeScanner } from '@/components/products/barcode-scanner'

type ProductFormData = {
  name: string
  name_ar: string
  barcode: string
  serial_number: string
  expiry_date: string
  purchase_price: string
  selling_price: string
  quantity: string
  minimum_stock: string
  category: string
  description: string
}

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter()
  const { t, isRTL } = useLocale()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || '',
    name_ar: product?.name_ar || '',
    barcode: product?.barcode || '',
    serial_number: product?.serial_number || '',
    expiry_date: product?.expiry_date 
      ? new Date(product.expiry_date).toISOString().split('T')[0] 
      : '',
    purchase_price: product?.purchase_price?.toString() || '',
    selling_price: product?.selling_price?.toString() || '',
    quantity: product?.quantity?.toString() || '0',
    minimum_stock: product?.minimum_stock?.toString() || '10',
    category: product?.category || '',
    description: product?.description || '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBarcodeScanned = (barcode: string) => {
    setFormData((prev) => ({ ...prev, barcode }))
    setShowScanner(false)
    toast.success(`Barcode scanned: ${barcode}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        selling_price: parseFloat(formData.selling_price),
        quantity: parseInt(formData.quantity, 10),
        minimum_stock: parseInt(formData.minimum_stock, 10),
        expiry_date: formData.expiry_date || null,
      }

      const url = product 
        ? `/api/products/${product.id}` 
        : '/api/products'
      
      const res = await fetch(url, {
        method: product ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(product ? t('productUpdated') : t('productAdded'))
        router.push('/dashboard/products')
      } else {
        const data = await res.json()
        toast.error(data.error || t('error'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className={isRTL ? 'rotate-180' : ''} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {product ? t('editProduct') : t('addNewProduct')}
          </h1>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner 
          onScan={handleBarcodeScanned} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">{t('productName')} *</FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="name_ar">{t('productNameAr')}</FieldLabel>
                  <Input
                    id="name_ar"
                    name="name_ar"
                    value={formData.name_ar}
                    onChange={handleChange}
                    dir="rtl"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="barcode">{t('barcode')}</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      ref={barcodeInputRef}
                      id="barcode"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      className="font-mono"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowScanner(true)}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <FieldDescription>Scan with camera or enter manually</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="serial_number">{t('serialNumber')}</FieldLabel>
                  <Input
                    id="serial_number"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleChange}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="category">{t('category')}</FieldLabel>
                  <Input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g., Antibiotics, Painkillers"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">{t('description')}</FieldLabel>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Pricing & Stock */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="purchase_price">{t('purchasePrice')} *</FieldLabel>
                    <Input
                      id="purchase_price"
                      name="purchase_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.purchase_price}
                      onChange={handleChange}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="selling_price">{t('sellingPrice')} *</FieldLabel>
                    <Input
                      id="selling_price"
                      name="selling_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.selling_price}
                      onChange={handleChange}
                      required
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="quantity">{t('quantity')}</FieldLabel>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="minimum_stock">{t('minimumStock')}</FieldLabel>
                    <Input
                      id="minimum_stock"
                      name="minimum_stock"
                      type="number"
                      min="0"
                      value={formData.minimum_stock}
                      onChange={handleChange}
                    />
                    <FieldDescription>Alert when stock falls below</FieldDescription>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="expiry_date">{t('expiryDate')}</FieldLabel>
                  <Input
                    id="expiry_date"
                    name="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={handleChange}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="h-4 w-4" /> : t('save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
