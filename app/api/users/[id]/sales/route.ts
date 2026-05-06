import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    // Cashiers can only see their own sales
    if (session.role !== 'admin' && session.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sales = await sql`
      SELECT id, total_amount, discount, payment_method, status, created_at
      FROM sales
      WHERE user_id = ${id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    const stats = await sql`
      SELECT 
        COUNT(*)::int as total_count,
        COALESCE(SUM(total_amount), 0)::numeric as total_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_count
      FROM sales
      WHERE user_id = ${id}
    `

    return NextResponse.json({ sales, stats: stats[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[pharmasync-track] User sales error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
