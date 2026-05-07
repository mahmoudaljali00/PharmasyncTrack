import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, logActivity } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await request.json()

    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
    }

    const result = await sql`
      UPDATE customers
      SET is_active = ${body.is_active}, updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id, is_active
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    await logActivity(admin.id, 'customer_status_changed', {
      customer_id: id,
      is_active: body.is_active,
    })

    return NextResponse.json({ customer: result[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] Customer status error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
