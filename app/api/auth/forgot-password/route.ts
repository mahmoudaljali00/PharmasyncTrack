import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { createPasswordResetToken, logActivity } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

// Simple in-memory rate limiter (per-process)
const requestMap = new Map<string, number[]>()
const MAX_REQUESTS = 3
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const timestamps = requestMap.get(key) || []
  const recent = timestamps.filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_REQUESTS) return false
  recent.push(now)
  requestMap.set(key, recent)
  return true
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`${ip}:${normalizedEmail}`)) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please try again later.' },
        { status: 429 }
      )
    }

    const users = (await sql`
      SELECT id, email, name, role, is_active
      FROM users
      WHERE LOWER(email) = ${normalizedEmail}
      LIMIT 1
    `) as Array<{
      id: string
      email: string
      name: string
      role: 'admin' | 'pharmacist' | 'cashier'
      is_active: boolean
    }>

    // Email not registered
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      )
    }

    const user = users[0]

    // Restrict reset-by-email to admin accounts only
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          error:
            'Password reset by email is only available for admin accounts. Please contact your administrator to reset your password.',
        },
        { status: 403 }
      )
    }

    if (!user.is_active) {
      return NextResponse.json(
        {
          error:
            'This account has been deactivated. Please contact your administrator.',
        },
        { status: 403 }
      )
    }

    // Generate one-time-use token (helper invalidates prior unused tokens)
    const token = await createPasswordResetToken(user.id)

    // Build reset URL
    const baseUrl =
      process.env.APP_URL ||
      request.headers.get('origin') ||
      `https://${request.headers.get('host')}`
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`

    // Send via Brevo
    const emailResult = await sendPasswordResetEmail(user.email, user.name, resetUrl)

    if (!emailResult.success) {
      console.error('[v0] Failed to send reset email:', emailResult.error)
      return NextResponse.json(
        {
          error:
            emailResult.error ||
            'Failed to send email. Please try again later.',
        },
        { status: 502 }
      )
    }

    await logActivity(user.id, 'password_reset_requested')

    return NextResponse.json({
      message: 'Reset link sent to your email',
      email: user.email,
    })
  } catch (error) {
    console.error('[v0] Forgot password error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
