import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
try {
  const envContent = readFileSync(resolve('.env.local'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const parts = trimmed.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      process.env[key] = val
    }
  }
} catch (e) {
  console.error('Failed to load .env.local:', e.message)
}

if (!process.env.CF_R2_ACCESS_KEY_ID || !process.env.CF_R2_SECRET_ACCESS_KEY || !process.env.CF_R2_ENDPOINT) {
  console.error('Missing env vars!')
  process.exit(1)
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
  },
})

async function run() {
  console.log('Listing R2 Buckets...')
  const result = await r2.send(new ListBucketsCommand({}))
  console.log('Buckets:', result.Buckets)
}

run().catch(console.error)
