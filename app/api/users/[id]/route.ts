import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, logActivity } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const users = await sql`
      SELECT id, email, name, role, is_active, last_login_at, created_at, updated_at
      FROM users WHERE id = ${id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: users[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] User GET error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const { name, email, role, is_active } = await request.json()

    if (role && !['admin', 'pharmacist', 'cashier'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent admin from deactivating themselves
    if (id === admin.id && is_active === false) {
      return NextResponse.json({ error: 'You cannot deactivate yourself' }, { status: 400 })
    }

    const result = await sql`
      UPDATE users SET
        name = COALESCE(${name ?? null}, name),
        email = COALESCE(${email ? email.toLowerCase() : null}, email),
        role = COALESCE(${role ?? null}, role),
        is_active = COALESCE(${is_active ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email, name, role, is_active, last_login_at, created_at, updated_at
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await logActivity(admin.id, 'user_updated', { target_user_id: id, changes: { name, email, role, is_active } })

    return NextResponse.json({ user: result[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] User PATCH error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    if (id === admin.id) {
      return NextResponse.json({ error: 'You cannot delete yourself' }, { status: 400 })
    }

    // Soft delete by deactivating to preserve sales history
    const result = await sql`
      UPDATE users SET is_active = FALSE, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await logActivity(admin.id, 'user_deleted', { target_user_id: id })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[v0] User DELETE error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
