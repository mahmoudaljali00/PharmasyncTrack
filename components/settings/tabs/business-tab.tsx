'use client'

import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import type { TabProps } from '../settings-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

export function BusinessTab({ settings, onPatch, saving }: TabProps) {
  const { t } = useLocale()
  const [draft, setDraft] = useState({
    tax_rate: settings.tax_rate,
    default_discount: settings.default_discount,
    low_stock_threshold: settings.low_stock_threshold,
    working_hours_start: settings.working_hours_start,
    working_hours_end: settings.working_hours_end,
  })

  const handleSave = async () => {
    await onPatch({
      tax_rate: clamp(Number(draft.tax_rate), 0, 100),
      default_discount: clamp(Number(draft.default_discount), 0, 100),
      low_stock_threshold: Math.max(0, Math.floor(Number(draft.low_stock_threshold))),
      working_hours_start: draft.working_hours_start,
      working_hours_end: draft.working_hours_end,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('businessRules')}</CardTitle>
        <CardDescription>{t('businessRulesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="tax_rate">{t('taxRate')}</Label>
            <Input
              id="tax_rate"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={draft.tax_rate}
              onChange={(e) => setDraft({ ...draft, tax_rate: Number(e.target.value) })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="discount">{t('defaultDiscount')}</Label>
            <Input
              id="discount"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={draft.default_discount}
              onChange={(e) => setDraft({ ...draft, default_discount: Number(e.target.value) })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="low_stock">{t('lowStockThresholdLabel')}</Label>
            <Input
              id="low_stock"
              type="number"
              min={0}
              step={1}
              value={draft.low_stock_threshold}
              onChange={(e) => setDraft({ ...draft, low_stock_threshold: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('workingHours')}</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="hours_start" className="text-xs text-muted-foreground">
                {t('workingHoursStart')}
              </Label>
              <Input
                id="hours_start"
                type="time"
                value={draft.working_hours_start}
                onChange={(e) => setDraft({ ...draft, working_hours_start: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hours_end" className="text-xs text-muted-foreground">
                {t('workingHoursEnd')}
              </Label>
              <Input
                id="hours_end"
                type="time"
                value={draft.working_hours_end}
                onChange={(e) => setDraft({ ...draft, working_hours_end: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Spinner className="me-2" />}
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}
