'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { getUploadPresignedUrl, R2_BUCKETS } from '@/lib/r2'
import { getDbUserId } from '@/actions/profile'

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getDbUserId(userId)
}

async function verifyMember(userId: string, messId: string): Promise<'member' | 'manager'> {
  const rows = await sql`
    SELECT role FROM mess_members
    WHERE user_id = ${userId}::uuid AND mess_id = ${messId}::uuid AND status = 'approved'
    LIMIT 1
  `
  if (!rows[0]) throw new Error('Access denied')
  return rows[0].role as 'member' | 'manager'
}

type UploadType = 'avatar' | 'chat-media' | 'receipt'

/**
 * Get a pre-signed URL for uploading a file to Cloudflare R2.
 * The client will PUT the file directly to R2 using this URL.
 * Returns both the upload URL and the final public URL of the file.
 */
export async function getPresignedUploadUrl(
  type: UploadType,
  filename: string,
  contentType: string,
  messId?: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const userId = await getCurrentUserId()

  // Validate content type
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
  if (!allowed.includes(contentType)) {
    throw new Error('Unsupported file type')
  }

  let bucket: typeof R2_BUCKETS[keyof typeof R2_BUCKETS]
  let key: string

  switch (type) {
    case 'avatar':
      bucket = R2_BUCKETS.AVATARS
      key = `avatars/${userId}/${Date.now()}-${filename}`
      break

    case 'chat-media':
      if (!messId) throw new Error('messId required for chat-media uploads')
      await verifyMember(userId, messId)
      bucket = R2_BUCKETS.CHAT_MEDIA
      key = `chat-media/${messId}/${Date.now()}-${filename}`
      break

    case 'receipt':
      if (!messId) throw new Error('messId required for receipt uploads')
      await verifyMember(userId, messId)
      bucket = R2_BUCKETS.RECEIPTS
      key = `receipts/${messId}/${Date.now()}-${filename}`
      break

    default:
      throw new Error('Invalid upload type')
  }

  return getUploadPresignedUrl(bucket, key, contentType)
}

/**
 * Update the current user's avatar URL in their profile after upload
 */
export async function updateAvatarUrl(publicUrl: string): Promise<void> {
  const userId = await getCurrentUserId()
  await sql`
    UPDATE profiles SET avatar_url = ${publicUrl}, updated_at = now()
    WHERE id = ${userId}::uuid
  `
}
