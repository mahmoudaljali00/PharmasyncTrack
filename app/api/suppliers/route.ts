import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, logActivity } from '@/lib/auth'

function sanitizeString(value: unknown, max = 500): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function GET() {
  try {
    await requireAdmin()

    const suppliers = await sql`
      SELECT id, name, phone, email, address, company_name, notes,
             is_active, created_at, updated_at
      FROM suppliers
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `

    return NextResponse.json({ suppliers })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[pharmasync-track] Suppliers GET error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()

    const name = sanitizeString(body.name, 255)
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const email = sanitizeString(body.email, 255)
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const phone = sanitizeString(body.phone, 50)
    const address = sanitizeString(body.address, 1000)
    const company_name = sanitizeString(body.company_name, 255)
    const notes = sanitizeString(body.notes, 2000)
    const is_active = body.is_active === false ? false : true

    const result = await sql`
      INSERT INTO suppliers (name, phone, email, address, company_name, notes, is_active)
      VALUES (${name}, ${phone}, ${email}, ${address}, ${company_name}, ${notes}, ${is_active})
      RETURNING id, name, phone, email, address, company_name, notes, is_active, created_at, updated_at
    `

    const supplier = result[0]
    await logActivity(admin.id, 'supplier_created', { supplier_id: supplier.id, name: supplier.name })

    return NextResponse.json({ supplier }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[pharmasync-track] Suppliers POST error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
