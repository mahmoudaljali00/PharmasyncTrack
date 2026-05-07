import { NextResponse } from 'next/server'
import { requireAdmin, logActivity } from '@/lib/auth'
import { sql } from '@/lib/db'
import { markBackupTaken } from '@/lib/settings'

const EXPORT_TABLES = [
  'pharmacy_settings',
  'users',
  'suppliers',
  'customers',
  'products',
  'sales',
  'sale_items',
  'stock_logs',
  'user_activity_logs',
] as const

const SENSITIVE_COLUMNS: Record<string, string[]> = {
  users: ['password_hash'],
}

export async function GET() {
  try {
    const admin = await requireAdmin()

    const dump: Record<string, unknown[]> = {}
    for (const table of EXPORT_TABLES) {
      // Use sql.query to allow dynamic table names safely (we control the list)
      const rows = await sql.query(`SELECT * FROM ${table}`)
      const sensitive = SENSITIVE_COLUMNS[table]
      if (sensitive) {
        for (const row of rows as Record<string, unknown>[]) {
          for (const col of sensitive) {
            if (col in row) row[col] = '__REDACTED__'
          }
        }
      }
      dump[table] = rows as unknown[]
    }

    await markBackupTaken()
    await logActivity(admin.id, 'settings.backup.exported', {
      tables: EXPORT_TABLES.length,
    })

    const payload = {
      version: 1,
      app: 'medsync-pro',
      exported_at: new Date().toISOString(),
      exported_by: admin.email,
      tables: dump,
    }

    const date = new Date().toISOString().slice(0, 10)
    const body = JSON.stringify(payload, null, 2)

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="medsync-backup-${date}.json"`,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[v0] backup export failed:', err)
    return NextResponse.json({ error: 'Backup export failed' }, { status: 500 })
  }
}
