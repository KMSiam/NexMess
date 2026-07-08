import { neon } from '@neondatabase/serverless'
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

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL!')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function run() {
  console.log('Migrating storage URLs to relative API proxy path...')
  
  const res1 = await sql`
    UPDATE profiles
    SET avatar_url = '/api/media?key=' || substring(avatar_url from 'https://[^/]+/(.*)')
    WHERE avatar_url LIKE 'http%'
  `
  console.log('Profiles avatar_url migrated.')

  const res2 = await sql`
    UPDATE profiles
    SET verification_doc_url = '/api/media?key=' || substring(verification_doc_url from 'https://[^/]+/(.*)')
    WHERE verification_doc_url LIKE 'http%'
  `
  console.log('Profiles verification_doc_url migrated.')

  const res3 = await sql`
    UPDATE expenses
    SET receipt_url = '/api/media?key=' || substring(receipt_url from 'https://[^/]+/(.*)')
    WHERE receipt_url LIKE 'http%'
  `
  console.log('Expenses receipt_url migrated.')

  // Check if chat_messages table has image_url or similar column
  // Let's do it dynamically inside try/catch in case the column/table schema differs
  try {
    await sql`
      UPDATE chat_messages
      SET image_url = '/api/media?key=' || substring(image_url from 'https://[^/]+/(.*)')
      WHERE image_url LIKE 'http%'
    `
    console.log('Chat messages migrated.')
  } catch (err) {
    console.log('Skipped chat_messages migration:', err.message)
  }

  console.log('🎉 Migration completed successfully!')
}

run().catch(console.error)
