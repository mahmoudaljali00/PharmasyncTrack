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

function parseDate(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const d = new Date(trimmed)
  if (isNaN(d.getTime())) return null
  return trimmed
}

export async function GET() {
  try {
    await requireAdmin()

    const customers = await sql`
      SELECT
        c.id, c.name, c.phone, c.email, c.address, c.date_of_birth, c.notes,
        c.is_active, c.created_at, c.updated_at,
        COALESCE(s.purchase_count, 0) AS purchase_count,
        COALESCE(s.total_spent, 0) AS total_spent
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, COUNT(*) AS purchase_count, SUM(total_amount) AS total_spent
        FROM sales
        WHERE status = 'completed' AND customer_id IS NOT NULL
        GROUP BY customer_id
      ) s ON s.customer_id = c.id
      WHERE c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `

    return NextResponse.json({ customers })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[pharmasync-track] Customers GET error:', error)
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
    const date_of_birth = parseDate(body.date_of_birth)
    const notes = sanitizeString(body.notes, 2000)
    const is_active = body.is_active === false ? false : true

    const result = await sql`
      INSERT INTO customers (name, phone, email, address, date_of_birth, notes, is_active)
      VALUES (${name}, ${phone}, ${email}, ${address}, ${date_of_birth}, ${notes}, ${is_active})
      RETURNING id, name, phone, email, address, date_of_birth, notes, is_active, created_at, updated_at
    `

    const customer = result[0]
    await logActivity(admin.id, 'customer_created', { customer_id: customer.id, name: customer.name })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[pharmasync-track] Customers POST error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
