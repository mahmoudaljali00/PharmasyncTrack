import { NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'
import { sql } from '@/lib/db'

const ADMIN_EMAIL = 'mr.mahmoudalbdry11@outlook.com'
const ADMIN_PASSWORD = 'admin123'
const ADMIN_NAME = 'Mahmoud Albdry'

export async function POST() {
  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL}`

    if (existing.length > 0) {
      return NextResponse.json({ message: 'Admin user already exists', email: ADMIN_EMAIL })
    }

    const user = await createUser(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, 'admin')

    return NextResponse.json({
      message: 'Admin user created successfully',
      user: { email: user.email, name: user.name, role: user.role },
    })
  } catch (error) {
    console.error('[pharmasync-track] Seed error:', error)
    return NextResponse.json({ error: 'An error occurred during seeding' }, { status: 500 })
  }
}
