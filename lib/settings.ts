'use server'

import { sql } from './db'

export type PharmacySettings = {
  id: number
  pharmacy_name: string
  pharmacy_address: string | null
  pharmacy_phone: string | null
  pharmacy_email: string | null
  pharmacy_logo_url: string | null
  cloudinary_logo_public_id: string | null
  tax_id: string | null
  currency: string
  currency_symbol: string
  timezone: string
  receipt_header: string | null
  receipt_footer: string | null
  receipt_paper_size: '58mm' | '80mm' | 'A4'
  receipt_show_logo: boolean
  receipt_show_tax: boolean
  low_stock_threshold: number
  tax_rate: number
  default_discount: number
  working_hours_start: string
  working_hours_end: string
  default_language: 'en' | 'ar'
  default_theme: 'light' | 'dark' | 'system'
  date_format: string
  decimal_places: number
  auto_backup_enabled: boolean
  auto_backup_frequency: 'daily' | 'weekly' | 'monthly'
  last_backup_at: Date | null
  updated_by: string | null
  updated_at: Date
}

export type SettingsUpdateInput = Partial<
  Omit<PharmacySettings, 'id' | 'updated_at' | 'updated_by' | 'last_backup_at'>
>

const SETTINGS_ID = 1

export async function getSettings(): Promise<PharmacySettings> {
  const rows = await sql`
    SELECT * FROM pharmacy_settings WHERE id = ${SETTINGS_ID} LIMIT 1
  `
  if (rows.length === 0) {
    // Auto-create the singleton row if missing (defensive)
    await sql`INSERT INTO pharmacy_settings (id) VALUES (${SETTINGS_ID}) ON CONFLICT (id) DO NOTHING`
    const recreated = await sql`SELECT * FROM pharmacy_settings WHERE id = ${SETTINGS_ID} LIMIT 1`
    return normalizeSettings(recreated[0])
  }
  return normalizeSettings(rows[0])
}

function normalizeSettings(row: Record<string, unknown>): PharmacySettings {
  return {
    ...row,
    tax_rate: Number(row.tax_rate ?? 0),
    default_discount: Number(row.default_discount ?? 0),
    low_stock_threshold: Number(row.low_stock_threshold ?? 10),
    decimal_places: Number(row.decimal_places ?? 2),
  } as PharmacySettings
}

const ALLOWED_KEYS: (keyof SettingsUpdateInput)[] = [
  'pharmacy_name',
  'pharmacy_address',
  'pharmacy_phone',
  'pharmacy_email',
  'pharmacy_logo_url',
  'cloudinary_logo_public_id',
  'tax_id',
  'currency',
  'currency_symbol',
  'timezone',
  'receipt_header',
  'receipt_footer',
  'receipt_paper_size',
  'receipt_show_logo',
  'receipt_show_tax',
  'low_stock_threshold',
  'tax_rate',
  'default_discount',
  'working_hours_start',
  'working_hours_end',
  'default_language',
  'default_theme',
  'date_format',
  'decimal_places',
  'auto_backup_enabled',
  'auto_backup_frequency',
]

export async function updateSettings(
  patch: SettingsUpdateInput,
  updatedBy: string
): Promise<PharmacySettings> {
  // Only allow whitelisted keys to flow through
  const entries = Object.entries(patch).filter(
    ([k, v]) => ALLOWED_KEYS.includes(k as keyof SettingsUpdateInput) && v !== undefined
  )

  if (entries.length === 0) {
    return getSettings()
  }

  // Run each field update in a single SQL statement using a CASE-less approach.
  // Neon's serverless driver doesn't support dynamic column lists in a single
  // tagged-template, so we issue one UPDATE per field. This is a tiny table
  // (one row), so cost is negligible.
  for (const [key, value] of entries) {
    await sql.query(
      `UPDATE pharmacy_settings SET ${key} = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`,
      [value, updatedBy, SETTINGS_ID]
    )
  }

  return getSettings()
}

export async function markBackupTaken(): Promise<void> {
  await sql`UPDATE pharmacy_settings SET last_backup_at = NOW() WHERE id = ${SETTINGS_ID}`
}
