import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@clerk/nextjs/server'

// Initialize S3/R2 client using env vars
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CF_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY!,
  },
})

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user to ensure they are logged in
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const key = request.nextUrl.searchParams.get('key')
    if (!key) {
      return new NextResponse('Missing key parameter', { status: 400 })
    }

    // Determine the bucket name based on the key prefix
    let bucket = ''
    if (key.startsWith('avatars/')) {
      bucket = 'avatars'
    } else if (key.startsWith('chat-media/')) {
      bucket = 'chat-media'
    } else if (key.startsWith('receipts/')) {
      bucket = 'receipts'
    } else {
      return new NextResponse('Invalid key prefix', { status: 400 })
    }

    // Fetch the object from R2
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const response = await r2.send(command)
    if (!response.Body) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Stream the response back to the client
    const headers = new Headers()
    headers.set('Content-Type', response.ContentType || 'application/octet-stream')
    headers.set('Cache-Control', response.CacheControl || 'public, max-age=31536000, immutable')

    return new NextResponse(response.Body as any, {
      status: 200,
      headers,
    })
  } catch (err: any) {
    console.error('R2 proxy error:', err)
    return new NextResponse(err.message || 'Internal Server Error', { status: 500 })
  }
}
