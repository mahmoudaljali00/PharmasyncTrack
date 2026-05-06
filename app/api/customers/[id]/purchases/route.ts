import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    const sales = await sql`
      SELECT
        s.id, s.total_amount, s.discount, s.payment_method, s.status,
        s.created_at,
        u.name AS user_name,
        COALESCE(items.item_count, 0) AS item_count
      FROM sales s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN (
        SELECT sale_id, COUNT(*) AS item_count
        FROM sale_items
        GROUP BY sale_id
      ) items ON items.sale_id = s.id
      WHERE s.customer_id = ${id}
      ORDER BY s.created_at DESC
      LIMIT 200
    `

    return NextResponse.json({ sales })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[pharmasync-track] Customer purchases error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
