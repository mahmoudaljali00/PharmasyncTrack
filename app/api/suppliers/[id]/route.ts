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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    const result = await sql`
      SELECT id, name, phone, email, address, company_name, notes,
             is_active, created_at, updated_at
      FROM suppliers
      WHERE id = ${id} AND deleted_at IS NULL
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ supplier: result[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] Supplier GET error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
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

    const result = await sql`
      UPDATE suppliers
      SET name = ${name},
          phone = ${phone},
          email = ${email},
          address = ${address},
          company_name = ${company_name},
          notes = ${notes},
          updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id, name, phone, email, address, company_name, notes, is_active, created_at, updated_at
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    await logActivity(admin.id, 'supplier_updated', { supplier_id: id })
    return NextResponse.json({ supplier: result[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] Supplier PUT error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    const result = await sql`
      UPDATE suppliers
      SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    await logActivity(admin.id, 'supplier_deleted', { supplier_id: id })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] Supplier DELETE error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
