'use server'

import { v2 as cloudinary } from 'cloudinary'

let configured = false

function configure() {
  if (configured) return
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  configured = true
}

export type CloudinarySignature = {
  timestamp: number
  signature: string
  apiKey: string
  cloudName: string
  folder: string
  uploadPreset?: string
}

/**
 * Generate a signed upload payload that the browser uses to upload directly
 * to Cloudinary. The api_secret never leaves the server.
 */
export async function getCloudinaryUploadSignature(
  folder = 'medsync/logos'
): Promise<CloudinarySignature> {
  configure()

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are not configured')
  }

  const timestamp = Math.floor(Date.now() / 1000)

  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    apiSecret
  )

  return {
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder,
  }
}

export async function deleteCloudinaryAsset(publicId: string): Promise<{ success: boolean; result?: string }> {
  configure()
  if (!process.env.CLOUDINARY_API_SECRET) {
    return { success: false }
  }
  try {
    const res = (await cloudinary.uploader.destroy(publicId)) as { result: string }
    return { success: res.result === 'ok' || res.result === 'not found', result: res.result }
  } catch (err) {
    console.error('[v0] Cloudinary delete failed:', err)
    return { success: false }
  }
}
