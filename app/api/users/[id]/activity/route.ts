import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    const logs = await sql`
      SELECT id, action, details, ip_address, user_agent, created_at
      FROM user_activity_logs
      WHERE user_id = ${id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return NextResponse.json({ logs })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] Activity GET error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
