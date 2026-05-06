import { NextResponse } from 'next/server'
import { authenticateUser, setSession, logActivity } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { user, error } = await authenticateUser(email, password)

    if (!user) {
      const message =
        error === 'deactivated'
          ? 'Your account has been deactivated. Please contact your administrator.'
          : 'Invalid email or password'
      return NextResponse.json({ error: message }, { status: 401 })
    }

    await setSession(user)
    await logActivity(user.id, 'login', { email: user.email })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('[pharmasync-track] Login error:', error)
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 })
  }
}
