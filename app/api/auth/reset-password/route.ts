import { NextResponse } from 'next/server'
import {
  verifyPasswordResetToken,
  consumePasswordResetToken,
  resetUserPassword,
  validatePasswordStrength,
  logActivity,
} from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    const validation = await validatePasswordStrength(password)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const userId = await verifyPasswordResetToken(token)
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    await resetUserPassword(userId, password)
    await consumePasswordResetToken(token)
    await logActivity(userId, 'password_reset_completed')

    return NextResponse.json({ message: 'Password has been reset successfully' })
  } catch (error) {
    console.error('[pharmasync-track] Reset password error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
