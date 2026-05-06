import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, hashPassword, validatePasswordStrength, logActivity } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const validation = await validatePasswordStrength(password)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const result = await sql`
      UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Revoke all refresh tokens to force re-login
    await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ${id}`
    await logActivity(admin.id, 'user_password_reset_by_admin', { target_user_id: id })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[pharmasync-track] Password reset error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
