import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getCloudinaryUploadSignature } from '@/lib/cloudinary'

export async function POST() {
  try {
    await requireAdmin()
    const sig = await getCloudinaryUploadSignature('medsync/logos')
    return NextResponse.json(sig)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (err instanceof Error && err.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.' },
        { status: 503 }
      )
    }
    console.error('[v0] upload-signature failed:', err)
    return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 })
  }
}
