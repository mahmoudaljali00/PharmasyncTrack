'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocale } from '@/contexts/locale-context'
import type { TabProps } from '../settings-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { formatMoney } from '@/lib/format'

export function ReceiptTab({ settings, onPatch, saving }: TabProps) {
  const { t, locale } = useLocale()
  const [draft, setDraft] = useState({
    receipt_header: settings.receipt_header ?? '',
    receipt_footer: settings.receipt_footer ?? '',
    receipt_paper_size: settings.receipt_paper_size,
    receipt_show_logo: settings.receipt_show_logo,
    receipt_show_tax: settings.receipt_show_tax,
  })

  const handleSave = async () => {
    await onPatch({
      receipt_header: draft.receipt_header || null,
      receipt_footer: draft.receipt_footer || null,
      receipt_paper_size: draft.receipt_paper_size,
      receipt_show_logo: draft.receipt_show_logo,
      receipt_show_tax: draft.receipt_show_tax,
    })
  }

  const previewWidth =
    draft.receipt_paper_size === '58mm'
      ? 'max-w-[220px]'
      : draft.receipt_paper_size === '80mm'
        ? 'max-w-[300px]'
        : 'max-w-[480px]'

  const sample = {
    items: [
      { name: 'Paracetamol 500mg', qty: 2, price: 3.5 },
      { name: 'Vitamin D 1000 IU', qty: 1, price: 12.0 },
    ],
    subtotal: 19.0,
    tax: 19.0 * (settings.tax_rate / 100),
  }
  const total = sample.subtotal + sample.tax

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('receiptCustomization')}</CardTitle>
          <CardDescription>{t('receiptCustomizationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>{t('paperSize')}</Label>
            <Select
              value={draft.receipt_paper_size}
              onValueChange={(v) =>
                setDraft({ ...draft, receipt_paper_size: v as '58mm' | '80mm' | 'A4' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm Thermal</SelectItem>
                <SelectItem value="80mm">80mm Thermal</SelectItem>
                <SelectItem value="A4">A4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="header">{t('receiptHeader')}</Label>
            <Textarea
              id="header"
              rows={2}
              value={draft.receipt_header}
              onChange={(e) => setDraft({ ...draft, receipt_header: e.target.value })}
              placeholder="Welcome to MedSync Pharmacy"
            />
            <p className="text-xs text-muted-foreground">{t('receiptHeaderHint')}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="footer">{t('receiptFooter')}</Label>
            <Textarea
              id="footer"
              rows={3}
              value={draft.receipt_footer}
              onChange={(e) => setDraft({ ...draft, receipt_footer: e.target.value })}
              placeholder="Thank you for your purchase!"
            />
            <p className="text-xs text-muted-foreground">{t('receiptFooterHint')}</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="show_logo" className="cursor-pointer">
              {t('showLogo')}
            </Label>
            <Switch
              id="show_logo"
              checked={draft.receipt_show_logo}
              onCheckedChange={(v) => setDraft({ ...draft, receipt_show_logo: v })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="show_tax" className="cursor-pointer">
              {t('showTax')}
            </Label>
            <Switch
              id="show_tax"
              checked={draft.receipt_show_tax}
              onCheckedChange={(v) => setDraft({ ...draft, receipt_show_tax: v })}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Spinner className="me-2" />}
              {t('saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('livePreview')}</CardTitle>
          <CardDescription>{draft.receipt_paper_size}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/40 rounded-lg p-4 flex justify-center">
            <div
              className={`${previewWidth} bg-background border shadow-sm font-mono text-[11px] leading-tight p-3 w-full`}
            >
              {draft.receipt_show_logo && settings.pharmacy_logo_url && (
                <div className="flex justify-center mb-2">
                  <Image
                    src={settings.pharmacy_logo_url}
                    alt=""
                    width={64}
                    height={64}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              <div className="text-center font-bold text-sm">{settings.pharmacy_name}</div>
              {settings.pharmacy_address && (
                <div className="text-center text-[10px]">{settings.pharmacy_address}</div>
              )}
              {settings.pharmacy_phone && (
                <div className="text-center text-[10px]">{settings.pharmacy_phone}</div>
              )}
              {draft.receipt_header && (
                <div className="text-center text-[10px] mt-2 italic">{draft.receipt_header}</div>
              )}
              <div className="border-t border-dashed my-2" />
              <div className="text-[10px]">#A1B2C3D4 — {new Date().toLocaleDateString()}</div>
              <div className="border-t border-dashed my-2" />
              {sample.items.map((item) => (
                <div key={item.name} className="mb-1">
                  <div>{item.name}</div>
                  <div className="flex justify-between text-[10px]">
                    <span>
                      {item.qty} ×{' '}
                      {formatMoney(item.price, {
                        currencySymbol: settings.currency_symbol,
                        decimalPlaces: settings.decimal_places,
                        locale,
                      })}
                    </span>
                    <span>
                      {formatMoney(item.qty * item.price, {
                        currencySymbol: settings.currency_symbol,
                        decimalPlaces: settings.decimal_places,
                        locale,
                      })}
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-dashed my-2" />
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {formatMoney(sample.subtotal, {
                    currencySymbol: settings.currency_symbol,
                    decimalPlaces: settings.decimal_places,
                    locale,
                  })}
                </span>
              </div>
              {draft.receipt_show_tax && sample.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({settings.tax_rate}%)</span>
                  <span>
                    {formatMoney(sample.tax, {
                      currencySymbol: settings.currency_symbol,
                      decimalPlaces: settings.decimal_places,
                      locale,
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold mt-1">
                <span>TOTAL</span>
                <span>
                  {formatMoney(total, {
                    currencySymbol: settings.currency_symbol,
                    decimalPlaces: settings.decimal_places,
                    locale,
                  })}
                </span>
              </div>
              {draft.receipt_footer && (
                <div className="text-center text-[10px] mt-3 italic">{draft.receipt_footer}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
