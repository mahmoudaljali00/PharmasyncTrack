import { NextResponse } from 'next/server'
import { clearSession, getSession, logActivity } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { allDevices } = await request.json().catch(() => ({ allDevices: false }))
    const session = await getSession()
    if (session) {
      await logActivity(session.id, allDevices ? 'logout_all_devices' : 'logout')
    }
    await clearSession(allDevices === true)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Logout error:', error)
    return NextResponse.json({ error: 'An error occurred during logout' }, { status: 500 })
  }
}
