import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
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

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
  },
})

async function run() {
  const bucket = 'avatars'
  const key = 'avatars/e198addb-443d-4250-8202-98b0282be1bd/1783528057347-Adobe Express - file.png'
  
  try {
    const res = await r2.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    }))
    console.log('🎉 Object exists in R2 bucket!', res)
  } catch (e) {
    console.log('❌ Object does NOT exist in R2 bucket:', e.name, '-', e.message)
  }
}

run().catch(console.error)
