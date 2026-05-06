import { NextResponse } from 'next/server'
import { requireAdmin, logActivity } from '@/lib/auth'
import { getSettings, updateSettings } from '@/lib/settings'
import { deleteCloudinaryAsset } from '@/lib/cloudinary'

export async function GET() {
  try {
    await requireAdmin()
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[pharmasync-track] GET /api/settings failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin()
    const patch = await request.json()

    // If logo URL is being replaced and we have a stored public_id, clean it up
    const current = await getSettings()
    if (
      patch.cloudinary_logo_public_id !== undefined &&
      current.cloudinary_logo_public_id &&
      current.cloudinary_logo_public_id !== patch.cloudinary_logo_public_id
    ) {
      await deleteCloudinaryAsset(current.cloudinary_logo_public_id)
    }

    const updated = await updateSettings(patch, admin.id)

    await logActivity(admin.id, 'settings.updated', {
      keys: Object.keys(patch),
    })

    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[pharmasync-track] PATCH /api/settings failed:', err)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
