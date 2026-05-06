import { NextResponse } from 'next/server'
import { requireAdmin, logActivity } from '@/lib/auth'
import { updateSettings } from '@/lib/settings'

/**
 * Restore is a sensitive operation. Rather than blindly truncating tables
 * (which would wipe sales/users), we accept a backup file and only restore
 * pharmacy_settings rows here. A full DB restore should go through Neon
 * point-in-time recovery, which we surface in the UI via a link.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json().catch(() => null) as
      | { tables?: { pharmacy_settings?: Array<Record<string, unknown>> } }
      | null

    if (!body || !body.tables) {
      return NextResponse.json(
        { error: 'Invalid backup file format' },
        { status: 400 }
      )
    }

    const settingsRow = body.tables.pharmacy_settings?.[0]
    if (!settingsRow) {
      return NextResponse.json(
        { error: 'Backup does not contain pharmacy_settings' },
        { status: 400 }
      )
    }

    // Strip server-managed fields
    const { id, updated_at, updated_by, last_backup_at, ...rest } = settingsRow as Record<string, unknown>
    void id
    void updated_at
    void updated_by
    void last_backup_at

    const updated = await updateSettings(rest as never, admin.id)

    await logActivity(admin.id, 'settings.backup.restored', {
      keys: Object.keys(rest).length,
    })

    return NextResponse.json({ success: true, settings: updated })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[pharmasync-track] backup restore failed:', err)
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 })
  }
}
