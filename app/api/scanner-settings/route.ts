import { NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { getSettings, updateSettings } from '@/lib/settings'

const VALID_MODES = ['auto', 'camera', 'scanner', 'manual'] as const
type Mode = (typeof VALID_MODES)[number]

function isMode(v: unknown): v is Mode {
  return typeof v === 'string' && (VALID_MODES as readonly string[]).includes(v)
}

/**
 * GET — any authenticated user can read scanner config (POS needs it).
 */
export async function GET() {
  try {
    await requireAuth()
    const s = await getSettings()
    return NextResponse.json({
      mode: s.scanner_mode,
      auto_submit: s.scanner_auto_submit,
      scan_delay: s.scanner_delay_ms,
      min_length: s.scanner_min_length,
      last_used: s.scanner_last_used,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[pharmasync-track] GET /api/scanner-settings failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * PUT — only admins can change global scanner config. Cashiers/pharmacists
 * may persist their last-used mode via PATCH (separate endpoint).
 */
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()

    const patch: Record<string, unknown> = {}

    if (body.mode !== undefined) {
      if (!isMode(body.mode)) {
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
      }
      patch.scanner_mode = body.mode
    }

    if (body.auto_submit !== undefined) {
      patch.scanner_auto_submit = Boolean(body.auto_submit)
    }

    if (body.scan_delay !== undefined) {
      const n = Number(body.scan_delay)
      if (!Number.isFinite(n) || n < 0 || n > 1000) {
        return NextResponse.json(
          { error: 'scan_delay must be 0-1000ms' },
          { status: 400 }
        )
      }
      patch.scanner_delay_ms = Math.round(n)
    }

    if (body.min_length !== undefined) {
      const n = Number(body.min_length)
      if (!Number.isFinite(n) || n < 1 || n > 100) {
        return NextResponse.json(
          { error: 'min_length must be 1-100' },
          { status: 400 }
        )
      }
      patch.scanner_min_length = Math.round(n)
    }

    const updated = await updateSettings(patch, admin.id)
    return NextResponse.json({
      mode: updated.scanner_mode,
      auto_submit: updated.scanner_auto_submit,
      scan_delay: updated.scanner_delay_ms,
      min_length: updated.scanner_min_length,
      last_used: updated.scanner_last_used,
    })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (err.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    console.error('[pharmasync-track] PUT /api/scanner-settings failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * PATCH — any authenticated user can persist their last-used mode preference.
 * This is a tiny write so cashiers' preference survives across sessions.
 */
export async function PATCH(request: Request) {
  try {
    const session = await requireAuth()
    const body = await request.json()

    if (!isMode(body.last_used)) {
      return NextResponse.json({ error: 'Invalid last_used' }, { status: 400 })
    }

    await updateSettings({ scanner_last_used: body.last_used }, session.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[pharmasync-track] PATCH /api/scanner-settings failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
