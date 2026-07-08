import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

if (!process.env.CF_R2_ACCESS_KEY_ID || !process.env.CF_R2_SECRET_ACCESS_KEY || !process.env.CF_R2_ENDPOINT) {
  throw new Error('Missing Cloudflare R2 environment variables')
}

// R2 is S3-compatible — configure with Cloudflare endpoint
export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
  },
})

export const R2_BUCKETS = {
  AVATARS: 'avatars',
  CHAT_MEDIA: 'chat-media',
  RECEIPTS: 'receipts',
} as const

type R2Bucket = typeof R2_BUCKETS[keyof typeof R2_BUCKETS]

/**
 * Generate a pre-signed URL for PUT (upload) - expires in 1 hour
 * The frontend will PUT the file directly to R2 using this URL.
 */
export async function getUploadPresignedUrl(
  bucket: R2Bucket,
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 })
  const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`

  return { uploadUrl, publicUrl }
}

/**
 * Delete an object from R2 storage
 */
export async function deleteR2Object(bucket: R2Bucket, key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key })
  await r2.send(command)
}

/**
 * Extract the key from an R2 public URL
 */
export function getKeyFromPublicUrl(url: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!
  return url.replace(`${base}/`, '')
}
