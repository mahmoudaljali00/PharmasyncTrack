import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSettings } from '@/lib/settings'

/**
 * Returns a non-sensitive subset of settings for any authenticated user.
 * Used by client components that need to render branded receipts, currency,
 * date formats, etc. without exposing admin-only fields like backup status.
 */
export async function GET() {
  try {
    await requireAuth()
    const s = await getSettings()
    return NextResponse.json({
      pharmacy_name: s.pharmacy_name,
      pharmacy_address: s.pharmacy_address,
      pharmacy_phone: s.pharmacy_phone,
      pharmacy_email: s.pharmacy_email,
      pharmacy_logo_url: s.pharmacy_logo_url,
      tax_id: s.tax_id,
      currency: s.currency,
      currency_symbol: s.currency_symbol,
      receipt_header: s.receipt_header,
      receipt_footer: s.receipt_footer,
      receipt_paper_size: s.receipt_paper_size,
      receipt_show_logo: s.receipt_show_logo,
      receipt_show_tax: s.receipt_show_tax,
      tax_rate: s.tax_rate,
      default_discount: s.default_discount,
      date_format: s.date_format,
      decimal_places: s.decimal_places,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[pharmasync-track] GET /api/settings/public failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
