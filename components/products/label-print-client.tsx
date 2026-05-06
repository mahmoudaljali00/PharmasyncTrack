'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Barcode } from '@/components/barcode'
import { useLocale } from '@/contexts/locale-context'
import { formatCurrency } from '@/lib/format'
import type { PharmacySettings } from '@/lib/settings'

type Product = {
  id: string
  name: string
  barcode: string | null
  selling_price: string
  unit: string | null
}

type LabelSize = 'small' | 'medium' | 'large'

export function LabelPrintClient({
  product,
  settings,
}: {
  product: Product
  settings: PharmacySettings
}) {
  const { t } = useLocale()
  const [count, setCount] = useState(12)
  const [size, setSize] = useState<LabelSize>('medium')

  const labels = Array.from({ length: Math.max(1, Math.min(count, 200)) })
  const price = Number(product.selling_price)
  const code = product.barcode || product.id.slice(0, 12)

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/products`}>
            <ArrowLeft className="h-4 w-4 me-2" />
            {t('products')}
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 me-2" />
          {t('print')}
        </Button>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>{t('printLabels')}</CardTitle>
          <CardDescription>{product.name}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="count">{t('labelCount')}</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="size">{t('labelSize')}</Label>
            <Select value={size} onValueChange={(v) => setSize(v as LabelSize)}>
              <SelectTrigger id="size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (4 per row)</SelectItem>
                <SelectItem value="medium">Medium (3 per row)</SelectItem>
                <SelectItem value="large">Large (2 per row)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="print-labels grid gap-2" data-size={size}>
        {labels.map((_, i) => (
          <div
            key={i}
            className="print-label rounded border bg-card p-2 text-center"
          >
            <p className="text-[10px] font-semibold truncate">
              {settings.pharmacy_name}
            </p>
            <p className="text-xs font-medium truncate">{product.name}</p>
            <div className="flex justify-center my-1">
              <Barcode value={code} height={size === 'large' ? 50 : 35} fontSize={10} />
            </div>
            <p className="text-sm font-bold">
              {formatCurrency(price, settings)}
              {product.unit ? ` / ${product.unit}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
