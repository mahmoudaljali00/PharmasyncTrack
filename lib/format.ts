/**
 * Pure formatting helpers that work on both server and client.
 * No "use server" / "use client" directive — these are isomorphic.
 */

export type FormatMoneyOptions = {
  currencySymbol?: string
  decimalPlaces?: number
  locale?: 'en' | 'ar'
}

export function formatMoney(
  value: number | string | null | undefined,
  opts: FormatMoneyOptions = {}
): string {
  const { currencySymbol = '$', decimalPlaces = 2, locale = 'en' } = opts
  const n = typeof value === 'string' ? Number(value) : (value ?? 0)
  if (!Number.isFinite(n)) return `${currencySymbol}0.00`

  const formatted = n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })
  return `${currencySymbol}${formatted}`
}

export function formatDate(
  value: Date | string | null | undefined,
  format: string = 'DD/MM/YYYY',
  locale: 'en' | 'ar' = 'en'
): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear())

  let formatted = format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)

  if (locale === 'ar') {
    // Convert ASCII digits to Arabic-Indic
    formatted = formatted.replace(/[0-9]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) + 0x0660 - 0x0030)
    )
  }
  return formatted
}

export function formatDateTime(
  value: Date | string | null | undefined,
  format: string = 'DD/MM/YYYY',
  locale: 'en' | 'ar' = 'en'
): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  const datePart = formatDate(d, format, locale)
  const time = d.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart} ${time}`
}

export function formatCurrency(
  value: number | string | null | undefined,
  settings: PharmacySettings,
  opts: FormatMoneyOptions = {}
): string {
  const { currencySymbol, decimalPlaces, locale } = opts
  return formatMoney(value, {
    currencySymbol: currencySymbol ?? (settings.currency_symbol || '$'),
    decimalPlaces: decimalPlaces ?? (settings.decimal_places ?? 2),
    locale: locale ?? (settings.language === 'ar' ? 'ar' : 'en'),
  })
}