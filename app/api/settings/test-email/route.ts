import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { getSettings } from '@/lib/settings'

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const { to } = (await request.json().catch(() => ({}))) as { to?: string }
    const target = (to || admin.email).trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const settings = await getSettings()

    const result = await sendEmail({
      to: target,
      subject: `Test email from ${settings.pharmacy_name}`,
      htmlContent: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 12px;color:#0f172a;">Email is working</h2>
          <p style="color:#334155;line-height:1.6;">
            This is a test email from <strong>${escapeHtml(settings.pharmacy_name)}</strong> sent via Resend.
          </p>
          <p style="color:#64748b;font-size:13px;">
            Sent at ${new Date().toISOString()}
          </p>
        </div>
      `,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[pharmasync-track] test email failed:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
