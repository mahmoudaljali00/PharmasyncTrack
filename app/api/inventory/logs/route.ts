import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const logs = await sql`
      SELECT 
        sl.*,
        p.name as product_name,
        u.name as user_name
      FROM stock_logs sl
      LEFT JOIN products p ON sl.product_id = p.id
      LEFT JOIN users u ON sl.user_id = u.id
      ORDER BY sl.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Get stock logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch stock logs' }, { status: 500 })
  }
}
