import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, hashPassword, validatePasswordStrength, logActivity } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()

    const users = await sql`
      SELECT 
        u.id, u.email, u.name, u.role, u.is_active, u.last_login_at, u.created_at, u.updated_at,
        COALESCE(s.sales_count, 0) as sales_count,
        COALESCE(s.total_sales, 0) as total_sales
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as sales_count, SUM(total_amount) as total_sales
        FROM sales
        WHERE status = 'completed'
        GROUP BY user_id
      ) s ON s.user_id = u.id
      ORDER BY u.created_at DESC
    `

    return NextResponse.json({ users })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] Users GET error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const { email, password, name, role } = await request.json()

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (!['admin', 'pharmacist', 'cashier'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const validation = await validatePasswordStrength(password)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const result = await sql`
      INSERT INTO users (email, password_hash, name, role, is_active)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${name}, ${role}, TRUE)
      RETURNING id, email, name, role, is_active, created_at
    `

    const user = result[0]
    await logActivity(admin.id, 'user_created', { target_user_id: user.id, email: user.email })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] Users POST error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
