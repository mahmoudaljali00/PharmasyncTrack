'use client'

import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import type { TabProps } from '../settings-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

const COMMON_CURRENCIES: Array<{ code: string; symbol: string; name: string }> = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar' },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar' },
]

const COMMON_TIMEZONES = [
  'UTC',
  'Africa/Cairo',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kuwait',
  'Asia/Amman',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
]

export function SystemTab({ settings, onPatch, saving }: TabProps) {
  const { t } = useLocale()
  const [draft, setDraft] = useState({
    currency: settings.currency,
    currency_symbol: settings.currency_symbol,
    timezone: settings.timezone,
    default_language: settings.default_language,
    default_theme: settings.default_theme,
    date_format: settings.date_format,
    decimal_places: settings.decimal_places,
  })

  const handleCurrencyCode = (code: string) => {
    const found = COMMON_CURRENCIES.find((c) => c.code === code)
    setDraft({
      ...draft,
      currency: code,
      currency_symbol: found?.symbol ?? draft.currency_symbol,
    })
  }

  const handleSave = async () => {
    await onPatch({
      currency: draft.currency,
      currency_symbol: draft.currency_symbol,
      timezone: draft.timezone,
      default_language: draft.default_language,
      default_theme: draft.default_theme,
      date_format: draft.date_format,
      decimal_places: Math.max(0, Math.min(4, Math.floor(draft.decimal_places))),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('systemPreferences')}</CardTitle>
        <CardDescription>{t('systemPreferencesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>{t('currency')}</Label>
            <Select value={draft.currency} onValueChange={handleCurrencyCode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="symbol">{t('currencySymbol')}</Label>
            <Input
              id="symbol"
              value={draft.currency_symbol}
              onChange={(e) => setDraft({ ...draft, currency_symbol: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>{t('timezone')}</Label>
            <Select
              value={draft.timezone}
              onValueChange={(v) => setDraft({ ...draft, timezone: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t('dateFormat')}</Label>
            <Select
              value={draft.date_format}
              onValueChange={(v) => setDraft({ ...draft, date_format: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>{t('defaultLanguage')}</Label>
            <Select
              value={draft.default_language}
              onValueChange={(v) =>
                setDraft({ ...draft, default_language: v as 'en' | 'ar' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t('defaultTheme')}</Label>
            <Select
              value={draft.default_theme}
              onValueChange={(v) =>
                setDraft({ ...draft, default_theme: v as 'light' | 'dark' | 'system' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('themeLight')}</SelectItem>
                <SelectItem value="dark">{t('themeDark')}</SelectItem>
                <SelectItem value="system">{t('themeSystem')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="decimals">{t('decimalPlaces')}</Label>
            <Input
              id="decimals"
              type="number"
              min={0}
              max={4}
              step={1}
              value={draft.decimal_places}
              onChange={(e) => setDraft({ ...draft, decimal_places: Number(e.target.value) })}
            />
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
